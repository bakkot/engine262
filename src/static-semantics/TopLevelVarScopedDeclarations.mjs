import { DeclarationPart, VarScopedDeclarations } from './all.mjs';

export function TopLevelVarScopedDeclarations(node) {
  if (Array.isArray(node)) {
    const declarations = [];
    for (const item of node) {
      declarations.push(...TopLevelVarScopedDeclarations(item));
    }
    return declarations;
  }
  switch (node.type) {
    case 'LabelledStatement':
      return TopLevelVarScopedDeclarations(node.LabelledItem);
    case 'FunctionDeclaration':
    case 'GeneratorDeclaration':
    case 'AsyncFunctionDeclaration':
    case 'AsyncGeneratorDeclaration':
      return [DeclarationPart(node)];
    default:
      return VarScopedDeclarations(node);
  }
}
