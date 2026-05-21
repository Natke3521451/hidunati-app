import React, { useState, useEffect, useRef } from 'react';
import { get, some, values, sortBy, orderBy, isEmpty, round } from 'lodash';
import { Howl } from 'howler';
import { AiOutlineDisconnect } from 'react-icons/ai';
import Header from '../components/Header';
import Footer from '../components/Footer';

const BUZZER_ACTIVE = `${process.env.PUBLIC_URL}/buzzer-active.png`;
const BUZZER_LOCKED = `${process.env.PUBLIC_URL}/buzzer-locked.png`;
const BTN_SOUND     = `${process.env.PUBLIC_URL}/btn-sound.png`;
const BTN_STOP      = `${process.env.PUBLIC_URL}/btn-stop.png`;
const BTN_LOCK      = `${process.env.PUBLIC_URL}/btn-lock.png`;
const BTN_RESET     = `${process.env.PUBLIC_URL}/btn-reset.png`;

export default function Table(game) {
  const [loaded, setLoaded]       = useState(false);
  const [buzzed, setBuzzer]       = useState(some(game.G.queue, (o) => o.id === game.playerID));
  const [lastBuzz, setLastBuzz]   = useState(null);
  const [sound, setSound]         = useState(false);
  const [soundPlayed, setSoundPlayed] = useState(false);
  const buzzButton  = useRef(null);
  const queueRef    = useRef(null);

  const buzzSound = new Howl({
    src: [
      `${process.env.PUBLIC_URL}/shortBuzz.webm`,
      `${process.env.PUBLIC_URL}/shortBuzz.mp3`,
    ],
    volume: 0.5,
    rate: 1.5,
  });

  const playSound = () => {
    if (sound && !soundPlayed) {
      buzzSound.play();
      setSoundPlayed(true);
    }
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
    if (isEmpty(game.G.queue)) {
      setSoundPlayed(false);
    } else if (loaded) {
      playSound();
    }
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

  // spacebar triggers buzz
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

  // resolve players & host
  const players = !game.gameMetadata
    ? []
    : game.gameMetadata.filter((p) => p.name).map((p) => ({ ...p, id: String(p.id) }));
  const firstPlayer =
    get(sortBy(players, (p) => parseInt(p.id, 10)).filter((p) => p.connected), '0') || null;
  const isHost = get(firstPlayer, 'id') === game.playerID;

  // leave game handler
  function leaveGame() {
    game.headerData.setAuth({ playerID: null, credentials: null, roomID: null });
  }

  // queues
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

  const buzzerImg = game.G.locked ? BUZZER_LOCKED : BUZZER_ACTIVE;
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
        <h3>סדר לחיצה</h3>
        <ul>
          {buzzedPlayers.map(({ id, name, timestamp, connected }, i) => (
            <li key={id}>
              <div
                className={`player-sign${isHost ? ' resettable' : ''}`}
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
        <h3>שחקנים</h3>
        <ul>
          {activePlayers.map(({ id, name, connected }) => (
            <li key={id}>
              <div className="player-sign">
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

  return (
    <div>
      <Header
        auth={game.headerData}
        clearAuth={leaveGame}
        gameID={game.gameID}
      />
      <main id="game">
        <div className="game-body">
          {!game.isConnected && (
            <p className="connection-warning">מנותק - מנסה להתחבר מחדש...</p>
          )}

          {isHost ? (
            /* ── S3: Host View ─────────────────────────── */
            <>
              <div className="host-top-row">
                <button
                  className={`ctrl-btn${sound ? ' active-sound' : ''}`}
                  onClick={() => setSound(!sound)}
                  title="הפעלת קול"
                >
                  <img src={BTN_SOUND} alt="הפעלת קול" />
                </button>
                <div className="room-row" style={{ flex: 1, justifyContent: 'center' }}>
                  {/* room shown in header already */}
                </div>
                <button
                  className="ctrl-btn"
                  onClick={leaveGame}
                  title="עצירת משחק"
                >
                  <img src={BTN_STOP} alt="עצירת משחק" />
                </button>
              </div>

              {buzzerElement}

              <div className="host-bottom-row">
                <button
                  className="ctrl-btn"
                  onClick={() => game.moves.toggleLock()}
                  title={game.G.locked ? 'פתח באזר' : 'נעל באזר'}
                >
                  <img src={BTN_LOCK} alt="נעילת באזר" />
                </button>
                <div className="spacer" />
                <button
                  className="ctrl-btn"
                  onClick={() => game.moves.resetBuzzers()}
                  title="איפוס כללי"
                >
                  <img src={BTN_RESET} alt="איפוס כללי" />
                </button>
              </div>
            </>
          ) : (
            /* ── S2: Player View ───────────────────────── */
            <>
              {buzzerElement}
            </>
          )}

          {playerLists}
        </div>
      </main>
      <Footer />
    </div>
  );
}
