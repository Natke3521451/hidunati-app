import React from 'react';

const TICKER_TEXT =
  'החידונתי - כמה החידה היא חידה ? עברך  •  החידונתי - כמה החידה היא חידה ? עברך  •  החידונתי - כמה החידה היא חידה ? עברך';

export function FooterSimple() {
  return null;
}

export default function Footer() {
  return (
    <div className="ticker-bar">
      <div className="ticker-label">החידונתי</div>
      <div className="ticker-track">
        <span className="ticker-text">{TICKER_TEXT}</span>
      </div>
    </div>
  );
}
