import React, { useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { get } from 'lodash';
import { joinRoom, getRoom, createRoom } from '../lib/endpoints';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ERR = {
  emptyCode: 'אנא הכנס קוד חדר',
  roomCode: 'לא ניתן להצטרף לחדר עם קוד זה',
  name: 'אנא הכנס שם קבוצה',
  dupName: 'שם הקבוצה כבר קיים',
  hostRoom: 'לא ניתן ליצור חדר, נסה שוב',
  fullRoom: 'החדר מלא',
};

export default function Lobby({ setAuth }) {
  const location = useLocation();
  const history = useHistory();
  const prefilledRoomID = get(location, 'state.roomID', '');

  const [name, setName] = useState('');
  const [room, setRoom] = useState(prefilledRoomID);
  const [joinMode, setJoinMode] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function enterRoom(roomId, hosting = false) {
    if (!hosting) setLoading(true);
    try {
      const roomRes = await getRoom(roomId);
      if (roomRes.status !== 200) throw new Error('roomCode');
      const roomData = roomRes.data;

      const playerSeat = roomData.players.find((p) => p.name === name);
      const freeSeat = roomData.players.find((p) => !p.name);

      if (playerSeat && playerSeat.connected) throw new Error('dupName');
      if (!playerSeat && !freeSeat) throw new Error('fullRoom');

      const playerID = get(playerSeat, 'id', get(freeSeat, 'id'));
      const joinRes = await joinRoom(roomData.roomID, playerID, name);
      if (joinRes.status !== 200) throw new Error('roomCode');

      setAuth({
        playerID,
        credentials: joinRes.data.playerCredentials,
        roomID: roomData.roomID,
      });
      setLoading(false);
      history.push(`/${roomData.roomID}`);
    } catch (err) {
      setLoading(false);
      setError(ERR[err.message] || ERR.roomCode);
    }
  }

  async function makeRoom() {
    setLoading(true);
    try {
      const createRes = await createRoom();
      if (createRes.status !== 200) throw new Error('hostRoom');
      await enterRoom(createRes.data.gameID, true);
    } catch (err) {
      setLoading(false);
      setError(ERR[err.message] || ERR.hostRoom);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (joinMode) {
      if (!room.trim()) return setError(ERR.emptyCode);
      if (!name.trim()) return setError(ERR.name);
      if (room.trim().length !== 6) return setError(ERR.roomCode);
      enterRoom(room.trim());
    } else {
      if (!name.trim()) return setError(ERR.name);
      makeRoom();
    }
  }

  return (
    <main id="lobby">
      <Header />
      <div className="lobby-card">
        <h2 className="lobby-title">
          {joinMode ? 'הצטרף למשחק' : 'צור חדר חדש'}
        </h2>
        <form className="lobby-form" onSubmit={handleSubmit}>
          {joinMode && (
            <div className="lobby-field">
              <label htmlFor="room-code">קוד חדר</label>
              <input
                id="room-code"
                type="text"
                value={room}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck="false"
                placeholder="הכנס קוד בן 6 תווים"
                onChange={(e) => {
                  setError('');
                  setRoom(e.target.value);
                }}
              />
            </div>
          )}
          <div className="lobby-field">
            <label htmlFor="team-name">שם הקבוצה</label>
            <input
              id="team-name"
              type="text"
              value={name}
              placeholder="שם הקבוצה שלך"
              onChange={(e) => {
                setError('');
                setName(e.target.value);
              }}
            />
          </div>
          <div className="lobby-error">{error}</div>
          <button type="submit" className="lobby-submit" disabled={loading}>
            {loading
              ? joinMode
                ? 'מצטרף...'
                : 'יוצר...'
              : joinMode
              ? 'הצטרף'
              : 'צור חדר'}
          </button>
          <div className="lobby-switcher">
            {joinMode ? (
              <>
                מארח משחק ?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setJoinMode(false);
                  }}
                >
                  צור חדר
                </button>
              </>
            ) : (
              <>
                מצטרף למשחק ?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setJoinMode(true);
                  }}
                >
                  הצטרף
                </button>
              </>
            )}
          </div>
        </form>
      </div>
      <Footer />
    </main>
  );
}
