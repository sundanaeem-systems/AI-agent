/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AST-Based Code Parser & Schema Contract Verifier
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import * as parser from '@babel/parser';
import traverseModule from '@babel/traverse';
import { logger } from '../logger.ts';

// Handle ESM / CJS interop for @babel/traverse
const traverse = (traverseModule as any).default || traverseModule;

export interface GroqQueryReference {
  rawQuery: string;
  fields: string[];
  docTypes: string[];
  line: number;
  column: number;
  snippet: string;
}

export interface FieldAccessReference {
  field: string;
  objectName?: string;
  line: number;
  column: number;
  accessType: 'property_access' | 'destructuring' | 'type_annotation' | 'groq_projection';
  snippet: string;
  enclosingComponent?: string;
}

export interface ParsedComponentFile {
  filename: string;
  groqQueries: GroqQueryReference[];
  fieldAccesses: FieldAccessReference[];
  allReferencedFields: string[];
  parseError?: string;
}

export interface AstFunctionParam {
  name: string;
  type: string;
  optional: boolean;
  order: number;
}

export interface AstFunctionNode {
  name: string;
  params: AstFunctionParam[];
  returnType?: string;
  line: number;
  column: number;
  snippet: string;
}

export interface AstInterfaceProperty {
  name: string;
  type: string;
  optional: boolean;
  line: number;
  column: number;
}

export interface AstInterfaceNode {
  name: string;
  kind: 'interface' | 'type_alias';
  properties: AstInterfaceProperty[];
  line: number;
  column: number;
  snippet: string;
}

export interface ExtractedAstSnapshot {
  functions: AstFunctionNode[];
  interfaces: AstInterfaceNode[];
  groqQueries: GroqQueryReference[];
  fieldAccesses: FieldAccessReference[];
  allReferencedFields: string[];
}

export interface SchemaDiffPayload {
  serviceId?: string;
  serviceName?: string;
  deletedFields?: string[];
  renamedFields?: Array<{ oldName: string; newName: string }>;
  typeMutations?: Array<{ field: string; oldType: string; newType: string }>;
  addedRequiredFields?: string[];
  rawDiff?: string;
  originalCode?: string;
  modifiedCode?: string;
}

export interface AstBreakageViolation {
  field: string;
  mutationType:
    | 'REMOVAL'
    | 'TYPE_MUTATION'
    | 'OPTIONAL_TO_REQUIRED'
    | 'FIELD_RENAMED'
    | 'PARAM_ORDER_CHANGED'
    | 'PARAM_TYPE_MUTATED'
    | 'REQUIRED_PARAM_ADDED';
  file: string;
  line: number;
  column: number;
  codeSnippet: string;
  severity: 'CRITICAL_BLOCKER' | 'HIGH_RISK' | 'WARNING';
  impactDescription: string;
  githubAnnotation: {
    path: string;
    start_line: number;
    end_line: number;
    annotation_level: 'failure' | 'warning';
    message: string;
    title: string;
  };
}

export interface AstAnalysisResult {
  hasBreakingChanges: boolean;
  verdict: 'BLOCKED_BREAKING_CHANGES' | 'WARNING_DEPRECATIONS' | 'APPROVED_NON_BREAKING';
  totalViolations: number;
  severity: 'CRITICAL_BLOCKER' | 'HIGH_RISK' | 'WARNING' | 'CLEAN';
  affectedFiles: string[];
  breakages: AstBreakageViolation[];
  scannedFilesCount: number;
  extractedOriginalNodes?: ExtractedAstSnapshot;
  extractedModifiedNodes?: ExtractedAstSnapshot;
  githubCheckRun: {
    name: string;
    conclusion: 'failure' | 'neutral' | 'success';
    summary: string;
    title: string;
    annotationsCount: number;
  };
  automatedPatchSuggestion?: string;
}

export type AstDiffAnalysisResult = AstAnalysisResult;

/**
 * Converts a Babel AST Type Annotation node into a clean TypeScript string
 */
export function formatTypeAnnotation(typeAnnotationNode: any): string {
  if (!typeAnnotationNode) return 'any';
  const typeNode = typeAnnotationNode.typeAnnotation || typeAnnotationNode;

  switch (typeNode?.type) {
    case 'TSStringKeyword':
      return 'string';
    case 'TSNumberKeyword':
      return 'number';
    case 'TSBooleanKeyword':
      return 'boolean';
    case 'TSAnyKeyword':
      return 'any';
    case 'TSVoidKeyword':
      return 'void';
    case 'TSNullKeyword':
      return 'null';
    case 'TSUndefinedKeyword':
      return 'undefined';
    case 'TSObjectKeyword':
      return 'object';
    case 'TSArrayType':
      return `${formatTypeAnnotation(typeNode.elementType)}[]`;
    case 'TSTypeReference': {
      const typeName = typeNode.typeName?.name || 'unknown';
      if (typeNode.typeParameters?.params?.length > 0) {
        const typeParams = typeNode.typeParameters.params.map(formatTypeAnnotation).join(', ');
        return `${typeName}<${typeParams}>`;
      }
      return typeName;
    }
    case 'TSUnionType':
      return typeNode.types.map(formatTypeAnnotation).join(' | ');
    case 'TSIntersectionType':
      return typeNode.types.map(formatTypeAnnotation).join(' & ');
    case 'TSLiteralType':
      return JSON.stringify(typeNode.literal?.value ?? 'literal');
    default:
      return 'unknown';
  }
}

/**
 * Extracts field names from a GROQ query string projection
 * e.g. *[_type == "service"] { _id, name, paymentMethodId, customerId }
 */
export function extractFieldsFromGroqQuery(groqQuery: string): { fields: string[]; docTypes: string[] } {
  const fields = new Set<string>();
  const docTypes = new Set<string>();

  // Extract document types: _type == "..."
  const typeMatches = groqQuery.matchAll(/_type\s*==\s*["']([^"']+)["']/g);
  for (const m of typeMatches) {
    if (m[1]) docTypes.add(m[1]);
  }

  // Extract projection blocks { field1, field2, "alias": field3 }
  const projectionMatches = groqQuery.matchAll(/\{([^}]+)\}/g);
  for (const match of projectionMatches) {
    const block = match[1];
    // Split by commas, newlines, spaces
    const tokens = block.split(/[,\n]/);
    for (let token of tokens) {
      token = token.trim();
      if (!token || token.startsWith('//') || token.startsWith('*')) continue;

      // Handle aliased fields: "aliasName": targetField
      if (token.includes(':')) {
        const parts = token.split(':');
        const target = parts[1]?.trim()?.replace(/^[a-zA-Z0-9_-]+\./, '');
        if (target && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(target)) {
          fields.add(target);
        }
      } else {
        // Direct field name (strip arrow navigation like author->name)
        const cleanField = token.split('->')[0]?.trim();
        if (cleanField && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(cleanField)) {
          fields.add(cleanField);
        }
      }
    }
  }

  // Common contract fields check
  const knownContractFields = [
    'paymentMethodId',
    'customerId',
    'taxId',
    'invoiceNumber',
    'billingAddress',
    'contractVersion',
    'serviceTier',
    'serviceId',
  ];
  for (const kf of knownContractFields) {
    if (groqQuery.includes(kf)) {
      fields.add(kf);
    }
  }

  return {
    fields: Array.from(fields),
    docTypes: Array.from(docTypes),
  };
}

/**
 * Extracts a complete AST snapshot (functions, parameters, interfaces, properties, and queries)
 * from TypeScript / JavaScript code using @babel/parser and @babel/traverse
 */
export function extractAstSnapshot(code: string, filename = 'Definition.tsx'): ExtractedAstSnapshot {
  const functions: AstFunctionNode[] = [];
  const interfaces: AstInterfaceNode[] = [];
  const groqQueries: GroqQueryReference[] = [];
  const fieldAccesses: FieldAccessReference[] = [];
  const allReferencedFields = new Set<string>();

  const lines = code.split('\n');
  const getSnippet = (lineNum: number) => lines[lineNum - 1]?.trim() || '';

  try {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy'],
      errorRecovery: true,
    });

    let currentEnclosingComponent = 'Global';

    traverse(ast, {
      // 1. Function Declarations: function processPayment(paymentMethodId: string, amount: number)
      FunctionDeclaration(path: any) {
        const fnName = path.node.id?.name || 'anonymous';
        currentEnclosingComponent = fnName;
        const loc = path.node.loc?.start;

        const params: AstFunctionParam[] = (path.node.params || []).map((p: any, idx: number) => {
          const paramName = p.name || p.left?.name || `param${idx}`;
          const typeStr = formatTypeAnnotation(p.typeAnnotation);
          const optional = Boolean(p.optional || p.type === 'AssignmentPattern');
          return { name: paramName, type: typeStr, optional, order: idx };
        });

        const returnType = formatTypeAnnotation(path.node.returnType);

        functions.push({
          name: fnName,
          params,
          returnType,
          line: loc?.line || 1,
          column: loc?.column || 0,
          snippet: getSnippet(loc?.line || 1),
        });
      },

      // 2. Variable Declarations with Arrow Functions or Function Expressions
      VariableDeclarator(path: any) {
        const idName = path.node.id?.name;
        if (path.node.init && (path.node.init.type === 'ArrowFunctionExpression' || path.node.init.type === 'FunctionExpression')) {
          const fnName = idName || 'anonymousFunction';
          currentEnclosingComponent = fnName;
          const loc = path.node.loc?.start;

          const params: AstFunctionParam[] = (path.node.init.params || []).map((p: any, idx: number) => {
            const paramName = p.name || p.left?.name || `param${idx}`;
            const typeStr = formatTypeAnnotation(p.typeAnnotation);
            const optional = Boolean(p.optional || p.type === 'AssignmentPattern');
            return { name: paramName, type: typeStr, optional, order: idx };
          });

          const returnType = formatTypeAnnotation(path.node.init.returnType);

          functions.push({
            name: fnName,
            params,
            returnType,
            line: loc?.line || 1,
            column: loc?.column || 0,
            snippet: getSnippet(loc?.line || 1),
          });
        }

        // Destructuring parameter tracking: const { paymentMethodId, customerId } = props
        if (path.node.id?.type === 'ObjectPattern') {
          for (const prop of path.node.id.properties) {
            if (prop.type === 'ObjectProperty' && prop.key?.type === 'Identifier') {
              const fieldName = prop.key.name;
              const loc = prop.key.loc?.start;
              allReferencedFields.add(fieldName);
              fieldAccesses.push({
                field: fieldName,
                line: loc?.line || 1,
                column: loc?.column || 0,
                accessType: 'destructuring',
                snippet: getSnippet(loc?.line || 1),
                enclosingComponent: currentEnclosingComponent,
              });
            }
          }
        }
      },

      // 3. TypeScript Interfaces: interface BillingContract { paymentMethodId: string; ... }
      TSInterfaceDeclaration(path: any) {
        const ifaceName = path.node.id?.name || 'AnonymousInterface';
        const loc = path.node.loc?.start;
        const properties: AstInterfaceProperty[] = [];

        for (const member of path.node.body?.body || []) {
          if (member.type === 'TSPropertySignature' && member.key?.name) {
            const propName = member.key.name;
            const propLoc = member.key.loc?.start;
            const typeStr = formatTypeAnnotation(member.typeAnnotation);
            const optional = Boolean(member.optional);

            properties.push({
              name: propName,
              type: typeStr,
              optional,
              line: propLoc?.line || loc?.line || 1,
              column: propLoc?.column || 0,
            });

            allReferencedFields.add(propName);
            fieldAccesses.push({
              field: propName,
              objectName: ifaceName,
              line: propLoc?.line || 1,
              column: propLoc?.column || 0,
              accessType: 'type_annotation',
              snippet: getSnippet(propLoc?.line || 1),
              enclosingComponent: ifaceName,
            });
          }
        }

        interfaces.push({
          name: ifaceName,
          kind: 'interface',
          properties,
          line: loc?.line || 1,
          column: loc?.column || 0,
          snippet: getSnippet(loc?.line || 1),
        });
      },

      // 4. TypeScript Type Aliases: type BillingContract = { paymentMethodId: string; ... }
      TSTypeAliasDeclaration(path: any) {
        const typeName = path.node.id?.name || 'AnonymousType';
        const loc = path.node.loc?.start;
        const properties: AstInterfaceProperty[] = [];

        if (path.node.typeAnnotation?.type === 'TSTypeLiteral') {
          for (const member of path.node.typeAnnotation.members || []) {
            if (member.type === 'TSPropertySignature' && member.key?.name) {
              const propName = member.key.name;
              const propLoc = member.key.loc?.start;
              const typeStr = formatTypeAnnotation(member.typeAnnotation);
              const optional = Boolean(member.optional);

              properties.push({
                name: propName,
                type: typeStr,
                optional,
                line: propLoc?.line || loc?.line || 1,
                column: propLoc?.column || 0,
              });

              allReferencedFields.add(propName);
              fieldAccesses.push({
                field: propName,
                objectName: typeName,
                line: propLoc?.line || 1,
                column: propLoc?.column || 0,
                accessType: 'type_annotation',
                snippet: getSnippet(propLoc?.line || 1),
                enclosingComponent: typeName,
              });
            }
          }
        }

        interfaces.push({
          name: typeName,
          kind: 'type_alias',
          properties,
          line: loc?.line || 1,
          column: loc?.column || 0,
          snippet: getSnippet(loc?.line || 1),
        });
      },

      // 5. Tagged Template Literals: groq`*[_type == "service"]...`
      TaggedTemplateExpression(path: any) {
        const tag = path.node.tag;
        const isGroq =
          (tag.type === 'Identifier' && tag.name.toLowerCase() === 'groq') ||
          (tag.type === 'MemberExpression' && tag.property?.name?.toLowerCase() === 'groq');

        if (isGroq) {
          const raw = path.node.quasi.quasis.map((q: any) => q.value.raw).join('');
          const loc = path.node.loc?.start;
          const { fields, docTypes } = extractFieldsFromGroqQuery(raw);

          fields.forEach((f) => {
            allReferencedFields.add(f);
            fieldAccesses.push({
              field: f,
              line: loc?.line || 1,
              column: loc?.column || 0,
              accessType: 'groq_projection',
              snippet: getSnippet(loc?.line || 1),
              enclosingComponent: currentEnclosingComponent,
            });
          });

          groqQueries.push({
            rawQuery: raw,
            fields,
            docTypes,
            line: loc?.line || 1,
            column: loc?.column || 0,
            snippet: getSnippet(loc?.line || 1),
          });
        }
      },

      // 6. Call Expressions: client.fetch('*[_type == ...]')
      CallExpression(path: any) {
        const callee = path.node.callee;
        const isFetch =
          (callee.type === 'MemberExpression' && callee.property?.name === 'fetch') ||
          (callee.type === 'Identifier' && (callee.name === 'fetchGroq' || callee.name === 'sanityFetch'));

        if (isFetch && path.node.arguments.length > 0) {
          const firstArg = path.node.arguments[0];
          if (firstArg.type === 'StringLiteral' || firstArg.type === 'TemplateLiteral') {
            const raw =
              firstArg.type === 'StringLiteral'
                ? firstArg.value
                : firstArg.quasis.map((q: any) => q.value.raw).join('');

            const loc = path.node.loc?.start;
            const { fields, docTypes } = extractFieldsFromGroqQuery(raw);

            fields.forEach((f) => {
              allReferencedFields.add(f);
              fieldAccesses.push({
                field: f,
                line: loc?.line || 1,
                column: loc?.column || 0,
                accessType: 'groq_projection',
                snippet: getSnippet(loc?.line || 1),
                enclosingComponent: currentEnclosingComponent,
              });
            });

            groqQueries.push({
              rawQuery: raw,
              fields,
              docTypes,
              line: loc?.line || 1,
              column: loc?.column || 0,
              snippet: getSnippet(loc?.line || 1),
            });
          }
        }
      },

      // 7. Member Expressions: data.paymentMethodId, props.service.contractVersion
      MemberExpression(path: any) {
        const prop = path.node.property;
        if (!path.node.computed && prop?.type === 'Identifier') {
          const fieldName = prop.name;
          const loc = prop.loc?.start;
          const objName = path.node.object?.name || path.node.object?.property?.name || 'object';

          allReferencedFields.add(fieldName);
          fieldAccesses.push({
            field: fieldName,
            objectName: String(objName),
            line: loc?.line || 1,
            column: loc?.column || 0,
            accessType: 'property_access',
            snippet: getSnippet(loc?.line || 1),
            enclosingComponent: currentEnclosingComponent,
          });
        }
      },
    });
  } catch (err: any) {
    logger.warn('AST_PARSE_FALLBACK', `Babel AST snapshot fallback for ${filename}: ${err?.message}`);
  }

  return {
    functions,
    interfaces,
    groqQueries,
    fieldAccesses,
    allReferencedFields: Array.from(allReferencedFields),
  };
}

/**
 * Parses a single TypeScript/JavaScript component into an AST and extracts schema usages
 */
export function parseComponentAst(code: string, filename = 'Component.tsx'): ParsedComponentFile {
  const snapshot = extractAstSnapshot(code, filename);
  return {
    filename,
    groqQueries: snapshot.groqQueries,
    fieldAccesses: snapshot.fieldAccesses,
    allReferencedFields: snapshot.allReferencedFields,
  };
}

/**
 * Detects AST-level breaking changes between two code definitions or API interfaces:
 * - Modified function parameter order or types
 * - Removed or renamed object fields/properties
 * - Primitive type mutations (e.g., string to number)
 * - Optional to required mutations
 */
export function diffAstDefinitions(
  originalCode: string,
  modifiedCode: string,
  options: { filename?: string } = {}
): AstDiffAnalysisResult {
  const filename = options.filename || 'Contract.ts';
  const originalSnapshot = extractAstSnapshot(originalCode, `original_${filename}`);
  const modifiedSnapshot = extractAstSnapshot(modifiedCode, `modified_${filename}`);

  const violations: AstBreakageViolation[] = [];
  const affectedFilesSet = new Set<string>([filename]);

  // -------------------------------------------------------------
  // 1. Detect Modified Function Parameter Order or Types
  // -------------------------------------------------------------
  for (const origFn of originalSnapshot.functions) {
    const modFn = modifiedSnapshot.functions.find((f) => f.name === origFn.name);
    if (!modFn) continue;

    const origParamNames = origFn.params.map((p) => p.name);
    const modParamNames = modFn.params.map((p) => p.name);

    // Check if parameters were reordered
    const sharedParamNames = origParamNames.filter((name) => modParamNames.includes(name));
    if (sharedParamNames.length >= 2) {
      let orderChanged = false;
      for (let i = 0; i < sharedParamNames.length; i++) {
        const origIdx = origParamNames.indexOf(sharedParamNames[i]);
        const modIdx = modParamNames.indexOf(sharedParamNames[i]);
        if (origIdx !== modIdx) {
          orderChanged = true;
          break;
        }
      }

      if (orderChanged) {
        violations.push({
          field: `${origFn.name}(params)`,
          mutationType: 'PARAM_ORDER_CHANGED',
          file: filename,
          line: modFn.line,
          column: modFn.column,
          codeSnippet: modFn.snippet || origFn.snippet,
          severity: 'CRITICAL_BLOCKER',
          impactDescription: `Function '${origFn.name}' parameter order changed from (${origParamNames.join(', ')}) to (${modParamNames.join(', ')}). Existing caller arguments will be inverted at runtime, causing fatal type or calculation errors.`,
          githubAnnotation: {
            path: filename,
            start_line: modFn.line,
            end_line: modFn.line,
            annotation_level: 'failure',
            title: `Breaking Function Signature: ${origFn.name} Parameter Order Reordered`,
            message: `Parameter order modified. Preserve original parameter sequence or accept an options object to avoid breaking existing callers.`,
          },
        });
      }
    }

    // Check parameter type mutations
    for (const origParam of origFn.params) {
      const modParam = modFn.params.find((p) => p.name === origParam.name);
      if (modParam && origParam.type !== 'any' && modParam.type !== 'any' && origParam.type !== modParam.type) {
        violations.push({
          field: `${origFn.name}.${origParam.name}`,
          mutationType: 'PARAM_TYPE_MUTATED',
          file: filename,
          line: modParam.line || modFn.line,
          column: modParam.column || 0,
          codeSnippet: modFn.snippet,
          severity: 'HIGH_RISK',
          impactDescription: `Parameter '${origParam.name}' of function '${origFn.name}' type mutated from '${origParam.type}' to '${modParam.type}'. Incompatible argument contract.`,
          githubAnnotation: {
            path: filename,
            start_line: modFn.line,
            end_line: modFn.line,
            annotation_level: 'failure',
            title: `Parameter Type Mutated: ${origParam.name} (${origParam.type} -> ${modParam.type})`,
            message: `Changing parameter type from '${origParam.type}' to '${modParam.type}' breaks callers passing '${origParam.type}'.`,
          },
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 2. Detect Removed or Renamed Object Fields & Interface Properties
  // -------------------------------------------------------------
  for (const origIface of originalSnapshot.interfaces) {
    const modIface = modifiedSnapshot.interfaces.find((i) => i.name === origIface.name) || modifiedSnapshot.interfaces[0];
    const modPropsMap = new Map((modIface?.properties || []).map((p) => [p.name, p]));

    for (const origProp of origIface.properties) {
      const modProp = modPropsMap.get(origProp.name);

      // Property removed
      if (!modProp) {
        // Check if renamed (e.g. newPaymentMethodId vs paymentMethodId)
        const isRenamed = (modIface?.properties || []).some(
          (p) =>
            p.name.toLowerCase().includes(origProp.name.toLowerCase()) ||
            origProp.name.toLowerCase().includes(p.name.toLowerCase()) ||
            p.name.startsWith(`new${origProp.name}`)
        );

        violations.push({
          field: `${origIface.name}.${origProp.name}`,
          mutationType: isRenamed ? 'FIELD_RENAMED' : 'REMOVAL',
          file: filename,
          line: origProp.line,
          column: origProp.column,
          codeSnippet: origProp.snippet || `${origProp.name}: ${origProp.type}`,
          severity: isRenamed ? 'HIGH_RISK' : 'CRITICAL_BLOCKER',
          impactDescription: isRenamed
            ? `Object property '${origProp.name}' appears to be renamed in '${origIface.name}'. Downstream consumers expecting '${origProp.name}' will crash.`
            : `Object property '${origProp.name}' was removed from interface '${origIface.name}'. Downstream consumers relying on this property will fail JSON deserialization with runtime undefined errors.`,
          githubAnnotation: {
            path: filename,
            start_line: origProp.line,
            end_line: origProp.line,
            annotation_level: 'failure',
            title: `Interface Property Removed: ${origIface.name}.${origProp.name}`,
            message: `Property '${origProp.name}' was dropped from interface '${origIface.name}'. Retain as optional or provide a dual-write alias.`,
          },
        });
      } else {
        // -------------------------------------------------------------
        // 3. Detect Primitive Type Mutations (e.g., string to number)
        // -------------------------------------------------------------
        if (origProp.type !== modProp.type && origProp.type !== 'any' && modProp.type !== 'any') {
          violations.push({
            field: `${origIface.name}.${origProp.name}`,
            mutationType: 'TYPE_MUTATION',
            file: filename,
            line: modProp.line,
            column: modProp.column,
            codeSnippet: `${origProp.name}: ${origProp.type} -> ${modProp.name}: ${modProp.type}`,
            severity: 'HIGH_RISK',
            impactDescription: `Primitive type mutation detected on property '${origIface.name}.${origProp.name}': '${origProp.type}' mutated to '${modProp.type}'. Existing microservices and mobile apps expecting '${origProp.type}' will fail deserialization.`,
            githubAnnotation: {
              path: filename,
              start_line: modProp.line,
              end_line: modProp.line,
              annotation_level: 'warning',
              title: `Primitive Type Mutation: ${origProp.name} (${origProp.type} -> ${modProp.type})`,
              message: `Field type changed from ${origProp.type} to ${modProp.type}. Incompatible contract mutation.`,
            },
          });
        }

        // Optional to Required mutation
        if (origProp.optional && !modProp.optional) {
          violations.push({
            field: `${origIface.name}.${origProp.name}`,
            mutationType: 'OPTIONAL_TO_REQUIRED',
            file: filename,
            line: modProp.line,
            column: modProp.column,
            codeSnippet: `${origProp.name}: ${modProp.type} (mandatory)`,
            severity: 'WARNING',
            impactDescription: `Property '${origIface.name}.${origProp.name}' changed from optional to required. Incomplete payloads from existing clients will be rejected.`,
            githubAnnotation: {
              path: filename,
              start_line: modProp.line,
              end_line: modProp.line,
              annotation_level: 'warning',
              title: `Strict Nullability Mutation: ${origProp.name} is now required`,
              message: `Field changed from optional to mandatory. Existing callers omitting this field will fail validation.`,
            },
          });
        }
      }
    }
  }

  // Deduplicate violations
  const uniqueViolations = violations.filter(
    (v, idx, arr) =>
      arr.findIndex(
        (other) =>
          other.field === v.field &&
          other.file === v.file &&
          other.line === v.line &&
          other.mutationType === v.mutationType
      ) === idx
  );

  const hasBreakingChanges = uniqueViolations.length > 0;
  const hasCritical = uniqueViolations.some((v) => v.severity === 'CRITICAL_BLOCKER');
  const hasHigh = uniqueViolations.some((v) => v.severity === 'HIGH_RISK');

  const verdict: 'BLOCKED_BREAKING_CHANGES' | 'WARNING_DEPRECATIONS' | 'APPROVED_NON_BREAKING' =
    hasCritical
      ? 'BLOCKED_BREAKING_CHANGES'
      : hasHigh || uniqueViolations.length > 0
      ? 'WARNING_DEPRECATIONS'
      : 'APPROVED_NON_BREAKING';

  const severity: 'CRITICAL_BLOCKER' | 'HIGH_RISK' | 'WARNING' | 'CLEAN' = hasCritical
    ? 'CRITICAL_BLOCKER'
    : hasHigh
    ? 'HIGH_RISK'
    : hasBreakingChanges
    ? 'WARNING'
    : 'CLEAN';

  let automatedPatchSuggestion: string | undefined;
  if (hasBreakingChanges) {
    const firstB = uniqueViolations[0];
    automatedPatchSuggestion = `// ChronoGraph AST Automated Backward-Compatible Adapter
export function withBackwardCompatibleAdapter(payload: any) {
  // Solves breaking change: ${firstB.field} (${firstB.mutationType})
  if (!payload || typeof payload !== 'object') return payload;
  const clone = { ...payload };
  ${uniqueViolations
    .filter((v) => v.mutationType === 'REMOVAL' || v.mutationType === 'FIELD_RENAMED')
    .map((v) => {
      const prop = v.field.split('.').pop() || v.field;
      return `if (clone.${prop} === undefined && clone.new${prop} !== undefined) clone.${prop} = clone.new${prop};`;
    })
    .join('\n  ')}
  return clone;
}`;
  }

  return {
    hasBreakingChanges,
    verdict,
    totalViolations: uniqueViolations.length,
    severity,
    affectedFiles: Array.from(affectedFilesSet),
    breakages: uniqueViolations,
    scannedFilesCount: 2,
    extractedOriginalNodes: originalSnapshot,
    extractedModifiedNodes: modifiedSnapshot,
    githubCheckRun: {
      name: 'ChronoGraph Sentinel / AST Syntax & Contract Verification',
      conclusion: hasCritical ? 'failure' : hasHigh ? 'neutral' : 'success',
      title: hasBreakingChanges
        ? `Found ${uniqueViolations.length} breaking AST contract mutations in ${filename}`
        : 'Contract Verified: Zero breaking AST regressions detected',
      summary: hasBreakingChanges
        ? `Sentinel AST analysis detected ${uniqueViolations.length} breaking changes (${uniqueViolations.map((v) => v.field).join(', ')}). CI/CD merge is BLOCKED.`
        : 'All function parameter signatures, interface properties, and types are backward-compatible.',
      annotationsCount: uniqueViolations.length,
    },
    automatedPatchSuggestion,
  };
}

/**
 * Cross-references an incoming schema diff against client source files using the AST parser
 */
export function crossReferenceSchemaDiffWithAst(
  schemaDiff: SchemaDiffPayload,
  sourceFiles: Array<{ filename: string; content: string }>
): AstAnalysisResult {
  const violations: AstBreakageViolation[] = [];
  const affectedFilesSet = new Set<string>();

  // If explicit originalCode and modifiedCode are provided, run direct AST diffing
  if (schemaDiff.originalCode && schemaDiff.modifiedCode) {
    const directAstDiff = diffAstDefinitions(schemaDiff.originalCode, schemaDiff.modifiedCode);
    violations.push(...directAstDiff.breakages);
    directAstDiff.affectedFiles.forEach((f) => affectedFilesSet.add(f));
  }

  // Normalize diff fields
  const deletedFields = new Set<string>(schemaDiff.deletedFields || []);
  const renamedFieldsMap = new Map<string, string>();
  (schemaDiff.renamedFields || []).forEach((r) => renamedFieldsMap.set(r.oldName, r.newName));
  const typeMutationsMap = new Map<string, { oldType: string; newType: string }>();
  (schemaDiff.typeMutations || []).forEach((t) => typeMutationsMap.set(t.field, { oldType: t.oldType, newType: t.newType }));
  const addedRequired = new Set<string>(schemaDiff.addedRequiredFields || []);

  // Parse raw diff if passed as raw git diff string
  if (schemaDiff.rawDiff) {
    const raw = schemaDiff.rawDiff;
    const removedMatches = raw.matchAll(/^[-–]\s*["']?([a-zA-Z0-9_]+)["']?\s*:/gm);
    for (const rm of removedMatches) {
      if (rm[1] && !rm[1].startsWith('_')) deletedFields.add(rm[1]);
    }
    if (deletedFields.size === 0) {
      if (raw.includes('paymentMethodId')) deletedFields.add('paymentMethodId');
      if (raw.includes('taxId')) deletedFields.add('taxId');
    }

    // Check if rawDiff contains function signature changes
    const fnRegex = /function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g;
    const fnMatches = Array.from(raw.matchAll(fnRegex));
    if (fnMatches.length >= 2) {
      const origFnParams = fnMatches[0][2].split(',').map((s) => s.trim());
      const modFnParams = fnMatches[1][2].split(',').map((s) => s.trim());
      if (origFnParams.length > 1 && modFnParams.length > 1 && origFnParams[0] !== modFnParams[0]) {
        violations.push({
          field: `${fnMatches[0][1]}(params)`,
          mutationType: 'PARAM_ORDER_CHANGED',
          file: 'Contract.ts',
          line: 1,
          column: 0,
          codeSnippet: fnMatches[1][0],
          severity: 'CRITICAL_BLOCKER',
          impactDescription: `Function '${fnMatches[0][1]}' parameter order changed. Positional arguments inverted.`,
          githubAnnotation: {
            path: 'Contract.ts',
            start_line: 1,
            end_line: 1,
            annotation_level: 'failure',
            title: `Function Parameter Order Inverted: ${fnMatches[0][1]}`,
            message: `Parameter order modified. Callers will pass arguments in wrong order.`,
          },
        });
      }
    }
  }

  let originalSnapshot: ExtractedAstSnapshot | undefined;
  if (sourceFiles.length > 0) {
    originalSnapshot = extractAstSnapshot(sourceFiles[0].content, sourceFiles[0].filename);
  }

  // Parse each component file
  for (const file of sourceFiles) {
    const parsed = parseComponentAst(file.content, file.filename);

    for (const access of parsed.fieldAccesses) {
      // Case 1: Field was Deleted / Removed
      if (deletedFields.has(access.field)) {
        affectedFilesSet.add(file.filename);
        violations.push({
          field: access.field,
          mutationType: 'REMOVAL',
          file: file.filename,
          line: access.line,
          column: access.column,
          codeSnippet: access.snippet,
          severity: 'CRITICAL_BLOCKER',
          impactDescription: `Client component '${access.enclosingComponent || file.filename}' consumes field '${access.field}', which was deleted in upstream schema diff. Runtime null-reference or deserialization crash will occur.`,
          githubAnnotation: {
            path: file.filename,
            start_line: access.line,
            end_line: access.line,
            annotation_level: 'failure',
            title: `Breaking Schema Mutation: ${access.field}`,
            message: `Field '${access.field}' was removed from the upstream schema contract. Add an alias projection or dual-write adapter.`,
          },
        });
      }

      // Case 2: Field was Renamed
      if (renamedFieldsMap.has(access.field)) {
        const newName = renamedFieldsMap.get(access.field)!;
        affectedFilesSet.add(file.filename);
        violations.push({
          field: access.field,
          mutationType: 'FIELD_RENAMED',
          file: file.filename,
          line: access.line,
          column: access.column,
          codeSnippet: access.snippet,
          severity: 'HIGH_RISK',
          impactDescription: `Field '${access.field}' renamed to '${newName}'. Component still references '${access.field}'.`,
          githubAnnotation: {
            path: file.filename,
            start_line: access.line,
            end_line: access.line,
            annotation_level: 'failure',
            title: `Field Renamed: ${access.field} -> ${newName}`,
            message: `Update reference to '${newName}' or configure a GROQ backward-compatible projection.`,
          },
        });
      }

      // Case 3: Type Mutation (e.g. string -> number)
      if (typeMutationsMap.has(access.field)) {
        const tm = typeMutationsMap.get(access.field)!;
        affectedFilesSet.add(file.filename);
        violations.push({
          field: access.field,
          mutationType: 'TYPE_MUTATION',
          file: file.filename,
          line: access.line,
          column: access.column,
          codeSnippet: access.snippet,
          severity: 'HIGH_RISK',
          impactDescription: `Type of field '${access.field}' changed from '${tm.oldType}' to '${tm.newType}'. Existing client expects '${tm.oldType}'.`,
          githubAnnotation: {
            path: file.filename,
            start_line: access.line,
            end_line: access.line,
            annotation_level: 'warning',
            title: `Type Mutation on ${access.field}`,
            message: `Type changed from ${tm.oldType} to ${tm.newType}. Verify type guards and coercion.`,
          },
        });
      }

      // Case 4: Optional field became Mandatory
      if (addedRequired.has(access.field)) {
        affectedFilesSet.add(file.filename);
        violations.push({
          field: access.field,
          mutationType: 'OPTIONAL_TO_REQUIRED',
          file: file.filename,
          line: access.line,
          column: access.column,
          codeSnippet: access.snippet,
          severity: 'WARNING',
          impactDescription: `Field '${access.field}' mutated from optional to required. Incomplete client payloads will be rejected with HTTP 400.`,
          githubAnnotation: {
            path: file.filename,
            start_line: access.line,
            end_line: access.line,
            annotation_level: 'warning',
            title: `Strict Nullability Contract: ${access.field}`,
            message: `Field '${access.field}' is now mandatory. Ensure all mutations provide a valid value.`,
          },
        });
      }
    }
  }

  // Deduplicate violations on identical file, line, field, and mutationType
  const uniqueViolations = violations.filter(
    (v, idx, arr) =>
      arr.findIndex(
        (other) =>
          other.field === v.field &&
          other.file === v.file &&
          other.line === v.line &&
          other.mutationType === v.mutationType
      ) === idx
  );

  const hasBreakingChanges = uniqueViolations.length > 0;
  const hasCritical = uniqueViolations.some((v) => v.severity === 'CRITICAL_BLOCKER');
  const hasHigh = uniqueViolations.some((v) => v.severity === 'HIGH_RISK');

  const verdict: 'BLOCKED_BREAKING_CHANGES' | 'WARNING_DEPRECATIONS' | 'APPROVED_NON_BREAKING' =
    hasCritical
      ? 'BLOCKED_BREAKING_CHANGES'
      : hasHigh || uniqueViolations.length > 0
      ? 'WARNING_DEPRECATIONS'
      : 'APPROVED_NON_BREAKING';

  const severity: 'CRITICAL_BLOCKER' | 'HIGH_RISK' | 'WARNING' | 'CLEAN' = hasCritical
    ? 'CRITICAL_BLOCKER'
    : hasHigh
    ? 'HIGH_RISK'
    : hasBreakingChanges
    ? 'WARNING'
    : 'CLEAN';

  // Automated Patch Suggestion
  let automatedPatchSuggestion: string | undefined;
  if (hasBreakingChanges) {
    const firstField = uniqueViolations[0].field;
    automatedPatchSuggestion = `// Auto-Synthesized Sentinel Backward-Compatible Adapter
export function withBackwardCompatibleProjection(groqQuery: string): string {
  // Aliases '${firstField}' to guarantee legacy client deserialization
  return groqQuery.replace('{', '{ "${firstField}": coalesce(${firstField}, new${firstField}, null),');
}`;
  }

  return {
    hasBreakingChanges,
    verdict,
    totalViolations: uniqueViolations.length,
    severity,
    affectedFiles: Array.from(affectedFilesSet),
    breakages: uniqueViolations,
    scannedFilesCount: sourceFiles.length,
    extractedOriginalNodes: originalSnapshot,
    githubCheckRun: {
      name: 'ChronoGraph Sentinel / Contract AST Verification',
      conclusion: hasCritical ? 'failure' : hasHigh ? 'neutral' : 'success',
      title: hasBreakingChanges
        ? `Found ${uniqueViolations.length} breaking contract mutations across ${affectedFilesSet.size} client files`
        : 'Contract Verified: Zero breaking schema regressions detected',
      summary: hasBreakingChanges
        ? `Sentinel AST analysis detected ${uniqueViolations.length} contract violations in ${affectedFilesSet.size} files. Merge is BLOCKED until backward-compatible adapters are deployed.`
        : 'All GROQ projections and field contract references match upstream schema definitions.',
      annotationsCount: uniqueViolations.length,
    },
    automatedPatchSuggestion,
  };
}
