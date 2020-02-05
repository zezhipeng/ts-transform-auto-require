import {
  Identifier,
  Node,
  ObjectLiteralExpression,
  VariableDeclaration,
  createCall,
  createIdentifier,
  createPropertyAccess,
  createPropertyAssignment,
  createStringLiteral,
  isIdentifier,
  isObjectLiteralExpression,
  isVariableDeclaration,
  updateVariableDeclaration,
  updateObjectLiteral,
} from 'typescript'

import Visitor from './Visitor'
import VisitorContext, { DetectedFiles } from './VisitorContext'

/**
 * Throws an internal error because of an incorrect type.
 */
/* istanbul ignore next */
function incorrectNodeType(): never {
  throw new Error('Internal error: node is not of expected type')
}

/**
 * Assert that the node is an identifier.
 *
 * @param node - The node to assert.
 */
function assertIdentifier(node: Node | undefined): asserts node is Identifier {
  /* istanbul ignore if */
  if (!node || !isIdentifier(node)) {
    incorrectNodeType()
  }
}

/**
 * Assert that the node is an object literal expression.
 *
 * @param node - The node to assert.
 */
function assertObjectLiteralExpression(node: Node | undefined): asserts node is ObjectLiteralExpression {
  /* istanbul ignore if */
  if (!node || !isObjectLiteralExpression(node)) {
    incorrectNodeType()
  }
}

/**
 * The visitor inserting requires to appropriate places.
 */
export default class RequireInserter implements Visitor<VariableDeclaration> {
  private readonly detectedFiles: DetectedFiles

  public constructor(context: VisitorContext) {
    this.detectedFiles = context.detectedFiles
  }

  public wants(node: Node): node is VariableDeclaration {
    return (
      isVariableDeclaration(node) &&
      isIdentifier(node.name) &&
      !!node.initializer &&
      isObjectLiteralExpression(node.initializer) &&
      node.name.getText() in this.detectedFiles
    )
  }

  public visit(node: VariableDeclaration): Node {
    const identifier = node.name
    const initializer = node.initializer
    assertIdentifier(identifier)
    assertObjectLiteralExpression(initializer)
    return updateVariableDeclaration(
      node,
      identifier,
      node.type,
      updateObjectLiteral(
        initializer,
        Object.entries(this.detectedFiles[identifier.getText()]).map(([filename, filepath]) =>
          createPropertyAssignment(
            createStringLiteral(filename),
            createPropertyAccess(
              createCall(createIdentifier('require'), undefined, [createStringLiteral(filepath)]),
              createIdentifier('default')
            )
          )
        )
      )
    )
  }
}
