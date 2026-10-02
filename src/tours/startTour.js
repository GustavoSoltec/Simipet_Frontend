import introJs from 'intro.js';
import 'intro.js/introjs.css';
import './introTheme.css';
import auditService from '../services/auditService';

/**
 * Arranca un tour de intro.js con opciones consistentes en toda la
 * app (textos en español, comportamiento de salida, etc). Se usa
 * desde el boton de Ayuda del Header, pasandole los pasos del modulo
 * actual (ver tours/index.js).
 */
export function startTour(steps, { modulo = 'app', submodulo = null } = {}) {
  if (!steps || !steps.length) return null;

  const intro = introJs();
  intro.setOptions({
    steps,
    nextLabel: 'Siguiente →',
    prevLabel: '← Atrás',
    doneLabel: 'Entendido',
    exitOnOverlayClick: true,
    exitOnEsc: true,
    showBullets: true,
    showProgress: true,
    disableInteraction: false,
  });

  auditService.logAccion(modulo, submodulo, 'ver-tour-ayuda', { pasos: steps.length });
  intro.start();
  return intro;
}

export default startTour;
