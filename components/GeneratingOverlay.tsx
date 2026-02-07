
import React, { useEffect, useState } from 'react';

interface GeneratingOverlayProps {
  isVisible: boolean;
  message: string;
  progress?: { current: number; total: number };
}

export const GeneratingOverlay: React.FC<GeneratingOverlayProps> = ({
  isVisible,
  message,
  progress,
}) => {
  const [show, setShow] = useState(false);
  const [render, setRender] = useState(false);

  // Handle mount/unmount with animation
  useEffect(() => {
    if (isVisible) {
      setRender(true);
      // Trigger enter animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShow(true);
        });
      });
    } else {
      setShow(false);
      const timer = setTimeout(() => setRender(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!render) return null;

  const progressPercent = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <>
      {/* Inject keyframe animations */}
      <style>{`
        @keyframes go-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes go-orbit {
          from { transform: rotate(0deg) translateX(48px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(48px) rotate(-360deg); }
        }
        @keyframes go-orbit-reverse {
          from { transform: rotate(180deg) translateX(36px) rotate(-180deg); }
          to { transform: rotate(540deg) translateX(36px) rotate(-540deg); }
        }
        @keyframes go-morph {
          0%, 100% { border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%; transform: rotate(0deg) scale(1); }
          25% { border-radius: 70% 30% 50% 50% / 30% 60% 40% 70%; transform: rotate(90deg) scale(1.05); }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; transform: rotate(180deg) scale(0.95); }
          75% { border-radius: 55% 45% 30% 70% / 65% 35% 60% 40%; transform: rotate(270deg) scale(1.02); }
        }
        @keyframes go-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes go-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes go-float-up {
          0% { transform: translateY(0) scale(1); opacity: 0.7; }
          50% { opacity: 1; }
          100% { transform: translateY(-20px) scale(0.8); opacity: 0; }
        }
        @keyframes go-ring-expand {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { opacity: 0.3; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes go-dot-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes go-progress-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.6), 0 0 40px rgba(99, 102, 241, 0.2); }
        }
        @keyframes go-checkmark-draw {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: show ? 'rgba(2, 6, 23, 0.85)' : 'rgba(2, 6, 23, 0)',
          backdropFilter: show ? 'blur(8px)' : 'blur(0px)',
          WebkitBackdropFilter: show ? 'blur(8px)' : 'blur(0px)',
          transition: 'background-color 0.4s ease, backdrop-filter 0.4s ease',
        }}
      >
        {/* Modal Card */}
        <div
          style={{
            transform: show ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(20px)',
            opacity: show ? 1 : 0,
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease',
            width: '100%',
            maxWidth: '420px',
            margin: '0 16px',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              borderRadius: '32px',
              padding: '48px 40px 40px',
              boxShadow: '0 32px 80px -12px rgba(0, 0, 0, 0.6), 0 0 60px -20px rgba(99, 102, 241, 0.15)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Subtle gradient accent at top */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #6366f1, #a855f7, #6366f1, transparent)',
                backgroundSize: '200% 100%',
                animation: 'go-gradient-shift 3s ease infinite',
              }}
            />

            {/* Animated Illustration */}
            <div
              style={{
                width: '140px',
                height: '140px',
                margin: '0 auto 32px',
                position: 'relative',
              }}
            >
              {/* Central morphing shape */}
              <div
                style={{
                  position: 'absolute',
                  inset: '25px',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7, #6366f1)',
                  backgroundSize: '200% 200%',
                  animation: 'go-morph 8s ease-in-out infinite, go-gradient-shift 4s ease infinite',
                  opacity: 0.8,
                }}
              />

              {/* Pulsing ring 1 */}
              <div
                style={{
                  position: 'absolute',
                  inset: '10px',
                  border: '2px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '50%',
                  animation: 'go-ring-expand 3s ease-out infinite',
                }}
              />

              {/* Pulsing ring 2 */}
              <div
                style={{
                  position: 'absolute',
                  inset: '10px',
                  border: '2px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '50%',
                  animation: 'go-ring-expand 3s ease-out infinite 1s',
                }}
              />

              {/* Pulsing ring 3 */}
              <div
                style={{
                  position: 'absolute',
                  inset: '10px',
                  border: '2px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: '50%',
                  animation: 'go-ring-expand 3s ease-out infinite 2s',
                }}
              />

              {/* Orbiting dot 1 */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '0',
                  height: '0',
                  animation: 'go-orbit 4s linear infinite',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#818cf8',
                    boxShadow: '0 0 12px rgba(129, 140, 248, 0.6)',
                    marginLeft: '-4px',
                    marginTop: '-4px',
                  }}
                />
              </div>

              {/* Orbiting dot 2 */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '0',
                  height: '0',
                  animation: 'go-orbit-reverse 5s linear infinite',
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#c084fc',
                    boxShadow: '0 0 10px rgba(192, 132, 252, 0.5)',
                    marginLeft: '-3px',
                    marginTop: '-3px',
                  }}
                />
              </div>

              {/* Center icon - image/AI symbol */}
              <div
                style={{
                  position: 'absolute',
                  inset: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'go-pulse 2.5s ease-in-out infinite',
                  zIndex: 2,
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))' }}
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>

              {/* Floating particles */}
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: i % 2 === 0 ? '#818cf8' : '#c084fc',
                    left: `${20 + i * 22}px`,
                    bottom: '15px',
                    animation: `go-float-up 2.5s ease-out infinite ${i * 0.4}s`,
                    opacity: 0,
                  }}
                />
              ))}
            </div>

            {/* Status Label */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#818cf8',
                }}
              >
                Generating
              </span>
              {/* Animated dots */}
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: '#818cf8',
                    animation: `go-dot-bounce 1.4s ease-in-out infinite ${i * 0.16}s`,
                  }}
                />
              ))}
            </div>

            {/* Progress Message */}
            <p
              style={{
                textAlign: 'center',
                color: '#cbd5e1',
                fontSize: '15px',
                fontWeight: 500,
                lineHeight: 1.6,
                marginBottom: progress ? '28px' : '8px',
                minHeight: '24px',
                transition: 'margin-bottom 0.3s ease',
              }}
            >
              {message}
            </p>

            {/* Progress Bar Section */}
            {progress && (
              <div style={{ transition: 'opacity 0.3s ease' }}>
                {/* Progress fraction and percentage */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#94a3b8',
                      fontWeight: 500,
                    }}
                  >
                    {progress.current} / {progress.total} slides
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#818cf8',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {progressPercent}%
                  </span>
                </div>

                {/* Progress Bar Track */}
                <div
                  style={{
                    position: 'relative',
                    height: '8px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    animation: 'go-progress-glow 2s ease-in-out infinite',
                  }}
                >
                  {/* Progress Bar Fill */}
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPercent}%`,
                      background: 'linear-gradient(90deg, #6366f1, #818cf8, #a78bfa)',
                      backgroundSize: '200% 100%',
                      borderRadius: '9999px',
                      transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                      position: 'relative',
                    }}
                  >
                    {/* Shimmer effect on the bar */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                        animation: 'go-shimmer 2s ease-in-out infinite',
                      }}
                    />
                  </div>
                </div>

                {/* Slide indicators */}
                {progress.total <= 12 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '6px',
                      marginTop: '16px',
                    }}
                  >
                    {Array.from({ length: progress.total }, (_, i) => {
                      const isComplete = i < progress.current;
                      const isCurrent = i === progress.current;
                      return (
                        <div
                          key={i}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 600,
                            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                            background: isComplete
                              ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                              : isCurrent
                              ? 'rgba(99, 102, 241, 0.15)'
                              : 'rgba(30, 41, 59, 0.6)',
                            color: isComplete
                              ? '#ffffff'
                              : isCurrent
                              ? '#818cf8'
                              : '#475569',
                            border: isCurrent
                              ? '1.5px solid rgba(99, 102, 241, 0.5)'
                              : '1px solid transparent',
                            boxShadow: isComplete
                              ? '0 2px 8px rgba(99, 102, 241, 0.3)'
                              : 'none',
                            transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
                          }}
                        >
                          {isComplete ? (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{
                                strokeDasharray: 24,
                                strokeDashoffset: 0,
                                animation: 'go-checkmark-draw 0.3s ease-out',
                              }}
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            i + 1
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Subtle hint text */}
            <p
              style={{
                textAlign: 'center',
                color: '#475569',
                fontSize: '12px',
                marginTop: '20px',
              }}
            >
              AI that computes optimal text placement areas
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
