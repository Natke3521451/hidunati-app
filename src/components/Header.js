import React from 'react';

export default function Header({ gameID = null }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <img
          src={`${process.env.PUBLIC_URL}/nk-logo.png`}
          alt="NK"
          className="nk-logo"
        />
        {gameID && (
          <div className="room-display">
            <span>חדר :</span>
            <span className="room-code">{gameID}</span>
          </div>
        )}
        <img
          src={`${process.env.PUBLIC_URL}/logo-hidunati.png`}
          alt="החידונתי"
          className="main-logo"
        />
      </div>
    </header>
  );
}
