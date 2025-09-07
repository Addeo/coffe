/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * To add polyfills, install individual packages and import them here.
 */

/***************************************************************************************************
 * BROWSER POLYFILLS
 */

/**
 * By default, zone.js will patch all possible macroTask and DomEvents
 * user can disable parts of macroTask/DomEvents patch by setting following flags
 * because those flags need to be set before `zone.js` being loaded, and webpack
 * will put import in the top of bundle, so user need to create a separate file
 * in this directory (for example: zone-flags.ts), and put the following flags
 * into that file, and then add the following code before importing zone.js.
 * import './zone-flags';
 *
 * The flags allowed in zone-flags.ts are listed here.
 *
 * The following flags will disable zone.js completely:
 * (window as any).__Zone_disable_requestAnimationFrame = true;
 * (window as any).__Zone_disable_on_property = true;
 * (window as any).__Zone_disable_customElements = true;
 * (window as any).__Zone_disable_EventTarget = true;
 * (window as any).__Zone_disable_Element = true;
 * (window as any).__Zone_disable_SVG = true;
 * (window as any).__Zone_disable_XHR = true;
 * (window as any).__Zone_disable_geolocation = true;
 * (window as any).__Zone_disable_canvas = true;
 * (window as any).__Zone_disable_notification = true;
 * (window as any).__Zone_disable_IntersectionObserver = true;
 * (window as any).__Zone_disable_FileReader = true;
 * (window as any).__Zone_disable_timer = true;
 * (window as any).__Zone_disable_requestAnimationFrame = true;
 * (window as any).__Zone_disable_on_property = true;
 *
 *  in IE/Edge developer tools, the addEventListener will also be wrapped by zone.js
 *  with the following flag, it will bypass `zone.js` patch for IE/Edge
 * (window as any).__Zone_enable_cross_context_check = true;
 */

/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
