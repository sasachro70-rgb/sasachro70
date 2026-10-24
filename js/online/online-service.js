/* Online service: families, profiles, rooms, codes and game sessions.
   It only calls the database functions in supabase/migrations and reads what RLS allows; it never sends
   scores, roles or family ids it was not given by the server. Answers that cannot be sent are kept on the
   device and re-sent later with the same idempotency key, so they are never counted twice. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const QUEUE_KEY = 'fgh-online-queue';
  const CODE_RE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{10}$/;
  const PROFILE_COLS = 'id,family_id,guest_owner,display_name,avatar,created_at';
  const TURN_COLS = 'session_id,turn_no,profile_id,question,started_at,answer,correct,points,ms,answered_at';

  /* database errors arrive as text such as "not_allowed"; network problems become "offline" */
  function toError(err) {
    const msg = String((err && (err.message || err.error_description)) || err || 'error');
    const code = /failed to fetch|network|load failed|offline/i.test(msg) ? 'offline'
      : (/^[a-z_]+$/.test(msg.trim()) ? msg.trim() : (/permission denied/i.test(msg) ? 'not_allowed' : 'error'));
    return Object.assign(new Error(msg), { code });
  }
  const normalizeCode = code => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  /* iPad Safari 15.4+ has randomUUID; older ones get a v4 UUID from getRandomValues */
  const uuid = () => {
    if (G.crypto && G.crypto.randomUUID) return G.crypto.randomUUID();
    const b = G.crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  };
  function memoryStorage() { const m = {}; return { getItem: k => m[k] ?? null, setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; }

  function create(client, options) {
    options = options || {};
    let storage = options.storage;
    if (!storage) { try { storage = G.localStorage; storage.setItem('fgh-probe', '1'); storage.removeItem('fgh-probe'); } catch (e) { storage = memoryStorage(); } }

    async function rpc(name, args) {
      let res;
      try { res = await client.rpc(name, args || {}); } catch (e) { throw toError(e); }
      if (res.error) throw toError(res.error);
      return res.data;
    }
    async function rows(query) {
      let res;
      try { res = await query; } catch (e) { throw toError(e); }
      if (res.error) throw toError(res.error);
      return res.data || [];
    }
    const from = t => client.from(t);

    /* ---------- offline answer queue ---------- */
    const readQueue = () => { try { return JSON.parse(storage.getItem(QUEUE_KEY) || '[]'); } catch (e) { return []; } };
    const writeQueue = q => { try { storage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (e) { /* storage full or blocked */ } };

    const api = {
      normalizeCode,
      looksLikeCode: code => CODE_RE.test(normalizeCode(code)),
      formatCode: code => { const c = normalizeCode(code); return c.length === 10 ? c.slice(0, 5) + '-' + c.slice(5) : c; },

      /* ---------- families ---------- */
      async myFamilies(uid) {
        const fams = await rows(from('families').select('id,name,created_at').order('created_at'));
        const members = fams.length ? await rows(from('family_members').select('family_id,user_id,role').in('family_id', fams.map(f => f.id))) : [];
        return fams.map(f => Object.assign({}, f, {
          role: (members.find(m => m.family_id === f.id && m.user_id === uid) || {}).role || null,
          members: members.filter(m => m.family_id === f.id)
        }));
      },
      createFamily: name => rpc('create_family', { p_name: String(name || '').trim() }),
      setMemberRole: (family, user, role) => rpc('set_member_role', { p_family: family, p_user: String(user || '').trim(), p_role: role }),
      removeMember: (family, user) => rpc('remove_member', { p_family: family, p_user: user }),

      /* ---------- profiles ---------- */
      familyProfiles: family => rows(from('player_profiles').select(PROFILE_COLS).eq('family_id', family).order('display_name')),
      myGuestProfiles: uid => rows(from('player_profiles').select(PROFILE_COLS).eq('guest_owner', uid).order('created_at')),
      profilesById: ids => ids.length ? rows(from('player_profiles').select(PROFILE_COLS).in('id', ids)) : Promise.resolve([]),
      createChildProfile: (family, name, avatar) => rpc('create_child_profile', { p_family: family, p_name: String(name || '').trim(), p_avatar: avatar || '🙂' }),
      createGuestProfile: (name, avatar) => rpc('create_guest_profile', { p_name: String(name || '').trim(), p_avatar: avatar || '🙂' }),

      /* ---------- rooms ---------- */
      /* rooms this user may see: as host, participant or family member (RLS decides) */
      visibleRooms: () => rows(from('rooms').select('id,family_id,host_user_id,game_id,status,max_participants,created_at').eq('status', 'open').order('created_at', { ascending: false })),
      familyRooms: family => rows(from('rooms').select('id,family_id,host_user_id,game_id,status,max_participants,created_at').eq('family_id', family).order('created_at', { ascending: false })),
      async room(roomId) {
        const r = (await rows(from('rooms').select('id,family_id,host_user_id,game_id,status,max_participants,created_at').eq('id', roomId)))[0];
        if (!r) return null;
        const participants = await rows(from('room_participants').select('room_id,user_id,profile_id,role,joined_at,left_at').eq('room_id', roomId));
        const locals = await rows(from('room_local_players').select('room_id,profile_id').eq('room_id', roomId));
        const ids = Array.from(new Set(participants.map(p => p.profile_id).filter(Boolean).concat(locals.map(l => l.profile_id))));
        const profiles = await api.profilesById(ids);
        return Object.assign({}, r, { participants, locals, profiles });
      },
      createRoom: (family, gameId, max) => rpc('create_room', { p_family: family, p_game: gameId, p_max: max || 8 }),
      async createInvite(roomId, minutes, maxUses) {
        const r = await rpc('create_room_invite', { p_room: roomId, p_minutes: minutes || 120, p_max_uses: maxUses || 10 });
        return Array.isArray(r) ? r[0] : r;
      },
      invites: roomId => rows(from('room_invites').select('id,room_id,expires_at,max_uses,uses,revoked_at,created_at').eq('room_id', roomId).order('created_at', { ascending: false })),
      revokeInvite: id => rpc('revoke_room_invite', { p_invite: id }),
      /* checks the shape first so obvious typos do not use up the 5 tries; the server still checks everything */
      async joinRoom(code, profileId) {
        const c = normalizeCode(code);
        if (!CODE_RE.test(c)) throw Object.assign(new Error('invalid_code'), { code: 'invalid_code' });
        const r = await rpc('join_room', { p_code: c, p_profile: profileId });
        if (!r || !r.ok) throw Object.assign(new Error((r && r.error) || 'invalid_code'), { code: (r && r.error) || 'invalid_code' });
        return r.room_id;
      },
      leaveRoom: roomId => rpc('leave_room', { p_room: roomId }),
      removeParticipant: (roomId, user) => rpc('remove_participant', { p_room: roomId, p_user: user }),
      addLocalPlayer: (roomId, profileId) => rpc('add_local_player', { p_room: roomId, p_profile: profileId }),
      closeRoom: roomId => rpc('close_room', { p_room: roomId }),

      /* ---------- sessions ---------- */
      startSession: (roomId, gameId, timer, turns) => rpc('start_session', { p_room: roomId, p_game: gameId, p_timer: timer, p_turns: turns }),
      async latestSession(roomId) {
        return (await rows(from('game_sessions').select('id,room_id,family_id,game_id,status,timer_sec,started_at,finished_at').eq('room_id', roomId).order('started_at', { ascending: false }).limit(1)))[0] || null;
      },
      turns: sessionId => rows(from('session_turns').select(TURN_COLS).eq('session_id', sessionId).order('turn_no')),
      currentTurn: turns => turns.find(t => t.answer == null) || null,
      beginTurn: (sessionId, turnNo) => rpc('begin_turn', { p_session: sessionId, p_turn: turnNo }),
      /* the key is stored before sending, so a retry after a lost reply re-uses it */
      async submitAnswer(sessionId, turnNo, answer) {
        const q = readQueue();
        let item = q.find(i => i.session === sessionId && i.turn === turnNo);
        if (!item) { item = { session: sessionId, turn: turnNo, answer, key: uuid() }; q.push(item); writeQueue(q); }
        try {
          const r = await rpc('submit_answer', { p_session: sessionId, p_turn: turnNo, p_answer: item.answer, p_key: item.key });
          writeQueue(readQueue().filter(i => i.key !== item.key));
          return r;
        } catch (e) {
          if (e.code !== 'offline') writeQueue(readQueue().filter(i => i.key !== item.key));
          throw e;
        }
      },
      pendingAnswers: () => readQueue(),
      async flushQueue() {
        const sent = [];
        for (const item of readQueue()) {
          try { await api.submitAnswer(item.session, item.turn, item.answer); sent.push(item); }
          catch (e) { if (e.code === 'offline') break; }
        }
        return sent;
      },
      finishSession: sessionId => rpc('finish_session', { p_session: sessionId }),
      sessionResults: sessionId => rows(from('results').select('session_id,profile_id,family_id,score,correct,answered,rank').eq('session_id', sessionId).order('rank')),
      familyResults: family => rows(from('results').select('session_id,profile_id,family_id,score,correct,answered,rank').eq('family_id', family)),

      /* ---------- linking guest profiles ---------- */
      pendingLinkRequests: () => rows(from('profile_link_requests').select('id,profile_id,family_id,requested_by,status,created_at').eq('status', 'pending').order('created_at')),
      requestLink: (profileId, family) => rpc('request_profile_link', { p_profile: profileId, p_family: family }),
      approveLink: id => rpc('approve_profile_link', { p_request: id }),
      rejectLink: id => rpc('reject_profile_link', { p_request: id }),
      unlinkProfile: profileId => rpc('unlink_profile', { p_profile: profileId }),

      /* ---------- realtime: a private channel per room only nudges devices to reload; data always comes through RLS ---------- */
      subscribeRoom(roomId, onPing) {
        if (!client.channel) return () => {};
        const ch = client.channel('room:' + roomId, { config: { private: true } });
        ch.on('broadcast', { event: 'ping' }, () => onPing()).subscribe();
        return () => { try { client.removeChannel(ch); } catch (e) { /* already closed */ } };
      },
      ping(roomId) {
        if (!client.channel) return;
        const ch = client.getChannels ? client.getChannels().find(c => c.topic === 'realtime:room:' + roomId) : null;
        if (ch) ch.send({ type: 'broadcast', event: 'ping', payload: {} }).catch(() => {});
      }
    };
    return api;
  }

  FGH.onlineService = { create, toError };
})(typeof window !== 'undefined' ? window : globalThis);
