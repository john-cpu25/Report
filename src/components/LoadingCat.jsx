import React from 'react';
import './LoadingCat.css';

const LoadingCat = ({ message = "Synchronizing Intelligence..." }) => {
  return (
    <div className="cat-outer-container">
      <div className="cat">
        {/* Generate 30 segments matching the CSS nth-types */}
        {[...Array(30)].map((_, i) => (
          <div key={i} className="cat__segment"></div>
        ))}
      </div>
      <div className="cat-loading-message">{message}</div>
    </div>
  );
};

export default LoadingCat;
