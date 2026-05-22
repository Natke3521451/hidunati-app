import React, { useState, useEffect, useRef } from 'react';
import { get, some, values, sortBy, orderBy, isEmpty, round } from 'lodash';
import { Howl } from 'howler';
import { AiOutlineDisconnect } from 'react-icons/ai';
import { MdVolumeUp } from 'react-icons/md';
import Footer from '../components/Footer';
import { leaveRoom } from '../lib/endpoints';

const P = process.env.PUBLIC_URL;

export default function Table(game) {
  const [loaded, setLoaded]           = useState(false);
  const [buzzed, setBuzzer]           = useState(some(game.G.queue, (o) => o.id === game.playerID));
  const [lastBuzz, setLastBuzz]       = useState(null);
  const [sound, setSound]             = useState(false);
  const [soundPlayed, setSoundPlayed] = useState(false);
  const buzzButton = useRef(null);
  const queueRef   = useRef(null);

  const buzzSound = new Howl({
    src: [`${P}/shortBuzz.webm`, `${P}/shortBuzz.mp3`],
    volume: 0.5,
    rate: 1.5,
  });

  const playSound = () => {
    if (sound && !soundPlayed) { buzzSound.play(); setSoundPlayed(true); }
  };

  useEffect(() => {
    if (!game.G.queue[game.playerID]) {
      if (lastBuzz && Date.now() - lastBuzz < 500) {
        setTimeout(() => {
          if (queueRef.current && !queueRef.current[game.playerID]) setBuzzer(false);
        }, 500);
      } else {
        setBuzzer(false);
      }
    }
    if (isEmpty(game.G.queue)) { setSoundPlayed(false); }
    else if (loaded) { playSound(); }
    if (!loaded) setLoaded(true);
    queueRef.current = game.G.queue;
  }, [game.G.queue]); // eslint-disable-line

  const attemptBuzz = () => {
    if (!buzzed) {
      playSound();
      game.moves.buzz(game.playerID);
      setBuzzer(true);
      setLastBuzz(Date.now());
    }
  };

  useEffect(() => {
    const onKeydown = (e) => {
      if (e.keyCode === 32 && !e.repeat) {
        buzzButton.current && buzzButton.current.click();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, []);

  const players = !game.gameMetadata
    ? []
    : game.gameMetadata.filter((p) => p.name).map((p) => ({ ...p, id: String(p.id) }));

  // Host = lowest playerID among joined players — never filter by connected to prevent flipping
  const firstPlayer = get(sortBy(players, (p) => parseInt(p.id, 10)), '0') || null;
  const isHost = get(firstPlayer, 'id') === game.playerID;

  async function leaveGame() {
    try {
      const { roomID, playerID, credentials } = game.headerData;
      await leaveRoom(roomID, playerID, credentials);
    } catch (e) { /* ignore */ }
    game.headerData.setAuth({ playerID: null, credentials: null, roomID: null });
  }

  const queue = sortBy(values(game.G.queue), ['timestamp']);
  const buzzedPlayers = queue
    .map((p) => {
      const player = players.find((pl) => pl.id === p.id);
      return player ? { ...p, name: player.name, connected: player.connected } : {};
    })
    .filter((p) => p.name);

  const activePlayers = orderBy(
    players.filter((p) => !some(queue, (q) => q.id === p.id)),
    ['connected', 'name'],
    ['desc', 'asc']
  );

  const timeDisplay = (delta) =>
    delta > 1000 ? `+${round(delta / 1000, 2)} שנ'` : `+${delta} ms`;

  const buzzerImg = game.G.locked ? `${P}/buzzoff.png` : `${P}/buzz.png`;
  const buzzerDisabled = buzzed || game.G.locked;

  const buzzerElement = (
    <div className="buzzer-wrap">
      <button
        ref={buzzButton}
        className={`buzzer-btn${buzzed && !game.G.locked ? ' buzzed' : ''}`}
        disabled={buzzerDisabled}
        onClick={() => { if (!buzzerDisabled) attemptBuzz(); }}
        aria-label={game.G.locked ? 'הבאזר נעול' : buzzed ? 'לחצת' : 'לחץ'}
      >
        <img src={buzzerImg} alt="באזר" />
      </button>
    </div>
  );

  const playerLists = (
    <>
      <div className="queue-section">
        <p className="section-label">סדר לחיצה</p>
        <ul>
          {buzzedPlayers.map(({ id, name, timestamp, connected }, i) => (
            <li key={id}>
              <div
                className={`player-banner${isHost ? ' resettable' : ''}`}
                style={{ backgroundImage: `url(${P}/banner-name.png)` }}
                onClick={() => { if (isHost) game.moves.resetBuzzer(id); }}
              >
                <span className={`player-name${!connected ? ' dim' : ''}`}>
                  {name}
                  {!connected && <AiOutlineDisconnect className="disconnected-icon" />}
                </span>
                {i > 0 && (
                  <span className="player-delta">
                    {timeDisplay(timestamp - queue[0].timestamp)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="queue-section">
        <p className="section-label">שחקנים</p>
        <ul>
          {activePlayers.map(({ id, name, connected }) => (
            <li key={id}>
              <div className="player-banner" style={{ backgroundImage: `url(${P}/banner-name.png)` }}>
                <span className={`player-name${!connected ? ' dim' : ''}`}>
                  {name}
                  {!connected && <AiOutlineDisconnect className="disconnected-icon" />}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );

  /* ── Host View (S3) ─────────────────────────────────── */
  if (isHost) {
    return (
      <div>
        <div className="host-header">
          <div className="host-header-brand">
            <img src={`${P}/nk-logo.png`}        alt="NK"         className="host-nk-logo" />
            <img src={`${P}/hidunati-logo.png`}   alt="החידונתי"   className="host-hidunati-logo" />
          </div>
          <img src={`${P}/tent.png`} alt="" className="host-tent" />
        </div>

        <main id="game">
          <div className="game-body host-game-body">
            {!game.isConnected && (
              <p className="connection-warning">מנותק - מנסה להתחבר מחדש...</p>
            )}

            <div className="host-room-row">
              <span className="host-room-code">{game.gameID}</span>
              <span className="host-room-label">:חדר</span>
            </div>

            <div className="host-ctrl-row">
              <div className="host-btn-wrap">
                {sound && <MdVolumeUp className="sound-on-icon" />}
                <button className={`host-btn${sound ? ' host-btn-on' : ''}`} onClick={() => setSound(!sound)}>
                  <img src={`${P}/btn-voice.png`} alt="" />
                  <span>הפעלת קול</span>
                </button>
              </div>
              <button className="host-btn" onClick={leaveGame}>
                <img src={`${P}/btn-exit.png`} alt="" />
                <span>עזיבת משחק</span>
              </button>
            </div>

            <div className="host-buzzer-wrap">{buzzerElement}</div>

            <div className="host-ctrl-row">
              <button className="host-btn" onClick={() => game.moves.toggleLock()}>
                <img src={`${P}/btn-lock.png`} alt="" />
                <span>נעילת באזר</span>
              </button>
              <button className="host-btn" onClick={() => game.moves.resetBuzzers()}>
                <img src={`${P}/btn-reset.png`} alt="" />
                <span>איפוס כללי</span>
              </button>
            </div>

            {playerLists}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  /* ── Player View (S2) ───────────────────────────────── */
  return (
    <div>
      <div className="app-header">
        <img src={`${P}/hidunati-logo.png`} alt="החידונתי" className="header-logo-hidunati" />
        <img src={`${P}/nk-logo.png`}       alt="NK"       className="header-logo-nk" />
      </div>

      <main id="game">
        <div className="game-body">
          {!game.isConnected && (
            <p className="connection-warning">מנותק - מנסה להתחבר מחדש...</p>
          )}
          <div className="room-row">
            <img src={`${P}/room-icon.png`} alt="חדר" className="room-icon" />
            <span className="room-code-text">{game.gameID}</span>
            <button className="player-exit-text" onClick={leaveGame}>יציאה</button>
          </div>
          {buzzerElement}
          {playerLists}
        </div>
      </main>
      <Footer />
    </div>
  );
}
