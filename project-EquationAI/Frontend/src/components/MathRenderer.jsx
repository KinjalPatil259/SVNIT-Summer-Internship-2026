import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export const BlockMath = ({ math }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: true,
          throwOnError: false,
        });
      } catch (err) {
        containerRef.current.textContent = math;
      }
    }
  }, [math]);

  return <div className="katex-block-wrapper my-2" ref={containerRef} />;
};

export const InlineMath = ({ math }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: false,
          throwOnError: false,
        });
      } catch (err) {
        containerRef.current.textContent = math;
      }
    }
  }, [math]);

  return <span className="katex-inline-wrapper" ref={containerRef} />;
};
