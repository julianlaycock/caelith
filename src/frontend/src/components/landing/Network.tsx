'use client';
import { useEffect, useRef } from 'react';
import styles from '@/app/landing/landing.module.css';

const NODES = [
  { cx: 400, cy: 75, label: 'AIFMD II', lx1: 400, ly1: 95, lx2: 400, ly2: 215, delay: 300, animDelay: 0 },
  { cx: 570, cy: 155, label: 'KAGB', lx1: 570, ly1: 175, lx2: 430, ly2: 230, delay: 500, animDelay: 0.67 },
  { cx: 570, cy: 335, label: 'ELTIF 2.0', lx1: 570, ly1: 315, lx2: 430, ly2: 260, delay: 700, animDelay: 1.33 },
  { cx: 400, cy: 395, label: 'ANNEX IV', lx1: 400, ly1: 395, lx2: 400, ly2: 275, delay: 900, animDelay: 2 },
  { cx: 230, cy: 335, label: 'SIF LAW', lx1: 230, ly1: 315, lx2: 370, ly2: 260, delay: 1100, animDelay: 2.67 },
  { cx: 230, cy: 155, label: 'RAIF LAW', lx1: 230, ly1: 175, lx2: 370, ly2: 230, delay: 1300, animDelay: 3.33 },
];

const HEX_LINES = [
  { x1: 400, y1: 95, x2: 570, y2: 175, delay: 0 },
  { x1: 570, y1: 175, x2: 570, y2: 315, delay: 200 },
  { x1: 570, y1: 315, x2: 400, y2: 395, delay: 400 },
  { x1: 400, y1: 395, x2: 230, y2: 315, delay: 600 },
  { x1: 230, y1: 315, x2: 230, y2: 175, delay: 800 },
  { x1: 230, y1: 175, x2: 400, y2: 95, delay: 1000 },
];

export default function Network() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const lines = e.target.querySelectorAll('[data-draw-line]');
          lines.forEach((line) => {
            const delay = parseInt((line as HTMLElement).dataset.drawDelay || '0');
            setTimeout(() => line.classList.add(styles.drawn), delay);
          });
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.25 });
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={styles.networkSection} id="networkSection" data-dark-section>
      <svg width="800" height="450" viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
        {/* Ambient dots */}
        {[[50,30,4],[750,50,5],[120,420,3.5],[680,400,4.5],[350,30,3],[450,430,5.5]].map(([cx,cy,dur], i) => (
          <circle key={`dot-${i}`} cx={cx} cy={cy} r="2" fill="rgba(197,224,238,0.15)">
            <animate attributeName="opacity" values="0.1;0.4;0.1" dur={`${dur}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* Hex outline lines */}
        {HEX_LINES.map((l, i) => (
          <line
            key={`hex-${i}`}
            className={styles.drawLine}
            x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="rgba(255,255,255,0.1)" strokeWidth="1"
            data-draw-line data-draw-delay={l.delay}
          />
        ))}

        {/* Node groups */}
        {NODES.map((n, i) => (
          <g key={i} className={styles.svgOuterGroup}>
            <line
              className={`${styles.flowLine} ${styles.drawLine}`}
              x1={n.lx1} y1={n.ly1} x2={n.lx2} y2={n.ly2}
              stroke="rgba(197,224,238,0.2)" strokeWidth="1"
              data-draw-line data-draw-delay={n.delay}
            />
            <g className={styles.svgNode} style={{ transformOrigin: `${n.cx}px ${n.cy}px`, animationDelay: `${n.animDelay}s` }}>
              <circle cx={n.cx} cy={n.cy} r="30" stroke="#C5E0EE" strokeWidth="1.5" fill="rgba(197,224,238,0.06)" />
              <text x={n.cx} y={n.cy + 4} textAnchor="middle" fill="#C5E0EE" fontFamily="'JetBrains Mono',monospace" fontSize="11">{n.label}</text>
            </g>
          </g>
        ))}

        {/* Center hub */}
        <circle cx="400" cy="245" r="42" stroke="#C5E0EE" strokeWidth="2" fill="rgba(197,224,238,0.1)">
          <animate attributeName="r" values="42;44;42" dur="3s" repeatCount="indefinite" />
        </circle>
        <text x="400" y="241" textAnchor="middle" fill="white" fontFamily="'Sora',sans-serif" fontSize="14" fontWeight="600">CAELITH</text>
        <text x="400" y="258" textAnchor="middle" fill="rgba(197,224,238,0.6)" fontFamily="'JetBrains Mono',monospace" fontSize="9">247 RULES</text>
      </svg>
      <div className={styles.networkLabel}>Six regulatory frameworks. One engine. Zero gaps.</div>
    </section>
  );
}
