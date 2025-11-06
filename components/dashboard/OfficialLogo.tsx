import React, { ImgHTMLAttributes } from 'react';

const OfficialLogo: React.FC<ImgHTMLAttributes<HTMLImageElement>> = (props) => {
  // Using the stable placeholder logo as agreed upon to unblock testing.
  const logoDataUri = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUgMTJIOUMxMS4yMDkxIDEyIDEzIDEwLjIwOTEgMTMgOFY0QzEzIDIuNzk4NTggMTEuMjA5MSAxIDkgMUM2Ljc5MDg2IDEgNSA S43OTg1OCA1IDRWMjBDNSAyMC41NTIzIDUuNDQ3NzIgMjEgNiAyMUgxOEMxOC41NTIzIDIxIDE5IDIwLjU1MjMgMTkgMjBWMThDMTkgMTYuODk1NCAxOC4xMDQ2IDE2IDE3IDE2SDEzQzEwLjc5MDkgMTYgOSAxNC4yMDkxIDkgMTJWMjAiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==";
  
  return (
    <img src={logoDataUri} {...props} alt="Official Logo" />
  );
};

export default OfficialLogo;
