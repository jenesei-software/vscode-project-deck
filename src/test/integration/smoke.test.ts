import * as assert from "node:assert";
import * as vscode from "vscode";

suite("Project Manager Hub", () => {
  test("extension is available", () => {
    const extension = vscode.extensions.getExtension(
      "jenesei-software.project-manager-hub",
    );
    assert.ok(extension, "extension should be installed in the test host");
  });

  test("configuration defaults are sane", () => {
    const config = vscode.workspace.getConfiguration("projectDeck");
    assert.strictEqual(config.get("groupBy"), "path");
    assert.strictEqual(config.get("sortList"), "frecency");
    assert.strictEqual(config.get("pathGroupDepth"), 1);
  });

  test("commands are registered", async () => {
    const extension = vscode.extensions.getExtension(
      "jenesei-software.project-manager-hub",
    );
    await extension?.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("projectDeck.refresh"));
    assert.ok(commands.includes("projectDeck.switch"));
  });
});
