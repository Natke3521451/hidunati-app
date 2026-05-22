import React, { useState, useEffect, useRef } from 'react';
import { get, some, values, sortBy, orderBy, isEmpty, round } from 'lodash';
import { Howl } from 'howler';
import { AiOutlineDisconnect } from 'react-icons/ai';
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

  // Players & host logic
  const players = !game.gameMetadata
    ? []
    : game.gameMetadata.filter((p) => p.name).map((p) => ({ ...p, id: String(p.id) }));
  const firstPlayer =
    get(sortBy(players, (p) => parseInt(p.id, 10)).filter((p) => p.connected), '0') || null;
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
        <img src={`${P}/seder.png`} alt="סדר לחיצה" className="queue-label" />
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
        <img src={`${P}/players.png`} alt="שחקנים" className="queue-label" />
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

  return (
    <div>
      {/* ── Header ─────────────────────────────────── */}
      <div className="app-header">
        <img src={`${P}/hidunati-logo.png`} alt="החידונתי" className="header-logo-hidunati" />
        {isHost && (
          <div className="header-center">
            <button
              className={`header-btn-voice${sound ? ' active' : ''}`}
              onClick={() => setSound(!sound)}
              title="הפעלת קול"
            >
              <img src={`${P}/btn-voice.png`} alt="הפעלת קול" style={{ height: '100%', width: 'auto' }} />
            </button>
          </div>
        )}
        <img src={`${P}/nk-logo.png`} alt="NK" className="header-logo-nk" />
      </div>

      <main id="game">
        <div className="game-body">
          {!game.isConnected && (
            <p className="connection-warning">מנותק - מנסה להתחבר מחדש...</p>
          )}

          {isHost ? (
            /* ── S3: Host View ─────────────────────── */
            <>
              {/* Room code + exit */}
              <div className="room-row-host">
                <img src={`${P}/room-icon.png`} alt="חדר" className="room-icon" />
                <span className="room-code-text">{game.gameID}</span>
                <button className="btn-exit" onClick={leaveGame} title="עזוב משחק">
                  <img src={`${P}/btn-exit.png`} alt="יציאה" />
                </button>
              </div>

              {buzzerElement}

              {/* Reset + BuzzLock */}
              <div className="host-controls">
                <button className="ctrl-btn" onClick={() => game.moves.resetBuzzers()} title="איפוס כללי">
                  <img src={`${P}/btn-reset.png`} alt="איפוס כללי" />
                </button>
                <button className="ctrl-btn" onClick={() => game.moves.toggleLock()} title={game.G.locked ? 'פתח באזר' : 'נעל באזר'}>
                  <img src={`${P}/btn-lock.png`} alt="נעילת באזר" />
                </button>
              </div>
            </>
          ) : (
            /* ── S2: Player View ───────────────────── */
            <>
              <div className="room-row">
                <img src={`${P}/room-icon.png`} alt="חדר" className="room-icon" />
                <span className="room-code-text">{game.gameID}</span>
              </div>
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
