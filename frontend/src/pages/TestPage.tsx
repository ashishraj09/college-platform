import React from 'react';

const TestPage = () => {
  return (
    <div style={{ 
      padding: '50px', 
      backgroundColor: 'lightblue', 
      fontSize: '24px',
      color: 'darkblue',
      textAlign: 'center' 
    }}>
      <h1>🎉 TEST PAGE IS WORKING!</h1>
      <p>If you see this, React routing is functioning.</p>
      <p>Current time: {new Date().toLocaleTimeString()}</p>
    </div>
  );
};

export default TestPage;
