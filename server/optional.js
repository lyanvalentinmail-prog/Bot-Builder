/**
 * Carga módulos pesados solo cuando se usan de verdad.
 *
 * El nombre se pasa como variable a propósito: así los empaquetadores
 * serverless (por ejemplo @vercel/nft) no incluyen Baileys ni Bot Framework
 * en la función de Vercel, que no puede usarlos de todos modos. En Render,
 * Docker o local se resuelven normalmente desde node_modules.
 */
export function optionalImport(name) {
  return import(name);
}
