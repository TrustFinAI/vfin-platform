
import React, { ImgHTMLAttributes } from 'react';

const OfficialLogo: React.FC<ImgHTMLAttributes<HTMLImageElement>> = (props) => {
  // A professional, custom-designed logo for the VFIN brand.
  const logoDataUri = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiByeD0iNDgiIGZpbGw9IiMwZjE3MmEiLz4KPHBhdGggZD0iTTU2IDgwTDExMiAxNzZMMTQ0IDEyOCIgc3Ryb2tlPSIjNDI4NUY0IiBzdHJva2Utd2lkdGg9IjI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTExMiAxNzZMMjAwIDgwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==";
  
  return (
    <img src={logoDataUri} {...props} alt="VFIN Logo" />
  );
};

export default OfficialLogo;
