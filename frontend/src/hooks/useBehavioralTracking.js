import { useState, useEffect, useRef } from 'react';

export function useBehavioralTracking() {
  const [metrics, setMetrics] = useState({
    typing_speed_ms: 0,
    typing_regularity: 0,
    copy_paste_detected: 0,
    mouse_movement_entropy: 0,
    field_focus_changes: 0,
    tab_switches: 0,
    scroll_events: 0,
    form_start_time: Date.now(),
    keystrokes: []
  });

  const lastKeyTime = useRef(null);
  const mousePositions = useRef([]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const now = Date.now();
      if (lastKeyTime.current) {
        const interval = now - lastKeyTime.current;
        if (interval < 2000) { // On ignore les pauses trop longues
          setMetrics(prev => {
            const newKeystrokes = [...prev.keystrokes, interval];
            // Calculer la moyenne
            const avg = newKeystrokes.reduce((a, b) => a + b, 0) / newKeystrokes.length;
            // Calculer la régularité (écart-type simplifié ou variance)
            const variance = newKeystrokes.length > 1 
              ? newKeystrokes.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / newKeystrokes.length 
              : 0;
            
            return {
              ...prev,
              typing_speed_ms: Math.round(avg),
              typing_regularity: Math.min(1, variance / 5000), // Normalisé pour le modèle
              keystrokes: newKeystrokes
            };
          });
        }
      }
      lastKeyTime.current = now;
    };

    const handlePaste = () => {
      setMetrics(prev => ({ ...prev, copy_paste_detected: 1 }));
    };

    const handleFocusChange = () => {
      setMetrics(prev => ({ ...prev, field_focus_changes: prev.field_focus_changes + 1 }));
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setMetrics(prev => ({ ...prev, tab_switches: prev.tab_switches + 1 }));
      }
    };

    const handleScroll = () => {
      setMetrics(prev => ({ ...prev, scroll_events: prev.scroll_events + 1 }));
    };

    const handleMouseMove = (e) => {
      mousePositions.current.push({ x: e.clientX, y: e.clientY });
      if (mousePositions.current.length > 100) mousePositions.current.shift();
      
      // Calcul d'entropie très simplifié pour la démo
      if (mousePositions.current.length % 10 === 0) {
        setMetrics(prev => ({ ...prev, mouse_movement_entropy: Math.random() * 0.5 + 0.4 })); 
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('focusin', handleFocusChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('focusin', handleFocusChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const getFinalMetrics = (formData = {}) => {
    const now = Date.now();
    const duration = now - metrics.form_start_time;
    
    // Simuler/Récupérer les données de contexte
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const hour = new Date().getHours();
    const isWeekend = [0, 6].includes(new Date().getDay());

    return {
      typing_speed_ms: metrics.typing_speed_ms || 200,
      typing_regularity: metrics.typing_regularity || 0.5,
      copy_paste_detected: metrics.copy_paste_detected,
      mouse_movement_entropy: metrics.mouse_movement_entropy || 0.8,
      time_on_page_sec: Math.round(duration / 1000),
      field_focus_changes: metrics.field_focus_changes,
      form_fill_duration_ms: duration,
      tab_switches: metrics.tab_switches,
      scroll_events: metrics.scroll_events,
      is_new_device: 0, 
      device_fingerprint_match: 1,
      ip_country_match: 1,
      ip_is_vpn_proxy: 0,
      time_since_last_login_min: 120,
      login_failed_attempts: 0,
      session_age_sec: Math.round(duration / 1000) + 60,
      is_mobile_desktop_mismatch: 0,
      is_new_beneficiary: formData.is_new_beneficiary ? 1 : 0,
      amt_vs_avg_ratio: (formData.amount || 100) / 500, // Ratio arbitraire basé sur montant moyen de 500
      transactions_last_hour: 1,
      is_international: 0,
      hour_of_day: hour,
      is_weekend: isWeekend ? 1 : 0
    };
  };

  return { metrics, getFinalMetrics };
}
