/**
 * OxideKit VS Code Extension
 *
 * Main entry point for the OxideKit VS Code extension.
 * Handles:
 * - LSP client lifecycle
 * - Command registration
 * - Preview panel management
 * - Token explorer
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;
let devServerTerminal: vscode.Terminal | undefined;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('OxideKit extension activating...');

    // Start LSP client
    await startLspClient(context);

    // Register commands
    registerCommands(context);

    // Register tree view providers
    registerTreeViews(context);

    console.log('OxideKit extension activated');
}

/**
 * Extension deactivation
 */
export async function deactivate(): Promise<void> {
    console.log('OxideKit extension deactivating...');

    // Stop dev server if running
    if (devServerTerminal) {
        devServerTerminal.dispose();
    }

    // Stop LSP client
    if (client) {
        await client.stop();
    }
}

/**
 * Start the LSP client
 */
async function startLspClient(context: vscode.ExtensionContext): Promise<void> {
    // Get LSP path from settings or use bundled/project-local
    const config = vscode.workspace.getConfiguration('oxidekit');
    let serverPath = config.get<string>('lsp.path');

    if (!serverPath) {
        // Try to find oxide-lsp in common locations
        serverPath = await findOxideLsp(context);
    }

    if (!serverPath) {
        vscode.window.showWarningMessage(
            'oxide-lsp not found. Some features will be unavailable. ' +
            'Install OxideKit CLI or set oxidekit.lsp.path in settings.'
        );
        return;
    }

    const serverOptions: ServerOptions = {
        run: {
            command: serverPath,
            transport: TransportKind.stdio,
        },
        debug: {
            command: serverPath,
            transport: TransportKind.stdio,
            options: {
                env: {
                    ...process.env,
                    RUST_LOG: 'oxide_lsp=debug',
                },
            },
        },
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'oui' },
            { scheme: 'file', pattern: '**/oxide.toml' },
            { scheme: 'file', pattern: '**/plugin.toml' },
            { scheme: 'file', pattern: '**/theme.toml' },
            { scheme: 'file', pattern: '**/typography.toml' },
            { scheme: 'file', pattern: '**/fonts.toml' },
        ],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{oui,toml}'),
        },
        outputChannel: vscode.window.createOutputChannel('OxideKit Language Server'),
    };

    client = new LanguageClient(
        'oxidekit',
        'OxideKit Language Server',
        serverOptions,
        clientOptions
    );

    context.subscriptions.push(client.start());
}

/**
 * Find oxide-lsp binary
 */
async function findOxideLsp(context: vscode.ExtensionContext): Promise<string | undefined> {
    // Check project-local first (target/release or target/debug)
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        for (const folder of workspaceFolders) {
            const localPaths = [
                path.join(folder.uri.fsPath, 'target', 'release', 'oxide-lsp'),
                path.join(folder.uri.fsPath, 'target', 'debug', 'oxide-lsp'),
            ];

            for (const localPath of localPaths) {
                try {
                    await vscode.workspace.fs.stat(vscode.Uri.file(localPath));
                    return localPath;
                } catch {
                    // Not found, continue
                }
            }
        }
    }

    // Check bundled with extension
    const bundledPath = path.join(context.extensionPath, 'bin', 'oxide-lsp');
    try {
        await vscode.workspace.fs.stat(vscode.Uri.file(bundledPath));
        return bundledPath;
    } catch {
        // Not found
    }

    // Check PATH
    const whichCommand = process.platform === 'win32' ? 'where' : 'which';
    const { execSync } = require('child_process');
    try {
        const result = execSync(`${whichCommand} oxide-lsp`, { encoding: 'utf-8' });
        return result.trim().split('\n')[0];
    } catch {
        // Not in PATH
    }

    return undefined;
}

/**
 * Register extension commands
 */
function registerCommands(context: vscode.ExtensionContext): void {
    // Dev Server commands
    context.subscriptions.push(
        vscode.commands.registerCommand('oxidekit.startDevServer', startDevServer),
        vscode.commands.registerCommand('oxidekit.stopDevServer', stopDevServer)
    );

    // Build commands
    context.subscriptions.push(
        vscode.commands.registerCommand('oxidekit.buildDesktop', buildDesktop),
        vscode.commands.registerCommand('oxidekit.buildStatic', buildStatic)
    );

    // Project commands
    context.subscriptions.push(
        vscode.commands.registerCommand('oxidekit.validateProject', validateProject),
        vscode.commands.registerCommand('oxidekit.addPlugin', addPlugin),
        vscode.commands.registerCommand('oxidekit.newPlugin', newPlugin)
    );

    // i18n commands
    context.subscriptions.push(
        vscode.commands.registerCommand('oxidekit.i18nCheck', i18nCheck)
    );

    // Figma integration
    context.subscriptions.push(
        vscode.commands.registerCommand('oxidekit.figmaImport', figmaImport)
    );

    // LSP commands
    context.subscriptions.push(
        vscode.commands.registerCommand('oxidekit.restartLsp', restartLsp)
    );

    // Preview commands
    context.subscriptions.push(
        vscode.commands.registerCommand('oxidekit.showPreview', showPreview),
        vscode.commands.registerCommand('oxidekit.showTokenExplorer', showTokenExplorer)
    );

    // Component commands
    context.subscriptions.push(
        vscode.commands.registerCommand('oxidekit.createComponent', createComponent),
        vscode.commands.registerCommand('oxidekit.extractComponent', extractComponent),
        vscode.commands.registerCommand('oxidekit.wrapWithContainer', () => wrapWith('Container')),
        vscode.commands.registerCommand('oxidekit.wrapWithColumn', () => wrapWith('Column')),
        vscode.commands.registerCommand('oxidekit.wrapWithRow', () => wrapWith('Row'))
    );

    // Documentation commands
    context.subscriptions.push(
        vscode.commands.registerCommand('oxidekit.showMigrationGuide', showMigrationGuide)
    );
}

/**
 * Register tree view providers
 */
function registerTreeViews(context: vscode.ExtensionContext): void {
    // Components tree
    const componentsProvider = new ComponentsTreeProvider();
    vscode.window.registerTreeDataProvider('oxidekit-components', componentsProvider);

    // Tokens tree
    const tokensProvider = new TokensTreeProvider();
    vscode.window.registerTreeDataProvider('oxidekit-tokens', tokensProvider);

    // i18n tree
    const i18nProvider = new I18nTreeProvider();
    vscode.window.registerTreeDataProvider('oxidekit-i18n', i18nProvider);
}

// Command implementations

async function startDevServer(): Promise<void> {
    if (devServerTerminal) {
        vscode.window.showInformationMessage('Dev server is already running');
        return;
    }

    devServerTerminal = vscode.window.createTerminal('OxideKit Dev');
    devServerTerminal.show();
    devServerTerminal.sendText('oxide dev');

    vscode.window.showInformationMessage('Starting OxideKit dev server...');
}

async function stopDevServer(): Promise<void> {
    if (!devServerTerminal) {
        vscode.window.showInformationMessage('Dev server is not running');
        return;
    }

    devServerTerminal.dispose();
    devServerTerminal = undefined;

    vscode.window.showInformationMessage('Dev server stopped');
}

async function buildDesktop(): Promise<void> {
    const terminal = vscode.window.createTerminal('OxideKit Build');
    terminal.show();
    terminal.sendText('oxide build --release');
}

async function buildStatic(): Promise<void> {
    const terminal = vscode.window.createTerminal('OxideKit Build');
    terminal.show();
    terminal.sendText('oxide build --target static');
}

async function validateProject(): Promise<void> {
    const terminal = vscode.window.createTerminal('OxideKit Doctor');
    terminal.show();
    terminal.sendText('oxide doctor');
}

async function addPlugin(): Promise<void> {
    const pluginName = await vscode.window.showInputBox({
        prompt: 'Enter plugin name to add',
        placeHolder: 'e.g., @oxidekit/charts',
    });

    if (pluginName) {
        const terminal = vscode.window.createTerminal('OxideKit');
        terminal.show();
        terminal.sendText(`oxide add ${pluginName}`);
    }
}

async function newPlugin(): Promise<void> {
    const pluginName = await vscode.window.showInputBox({
        prompt: 'Enter name for new plugin',
        placeHolder: 'e.g., my-custom-components',
    });

    if (pluginName) {
        const terminal = vscode.window.createTerminal('OxideKit');
        terminal.show();
        terminal.sendText(`oxide plugin new ${pluginName}`);
    }
}

async function i18nCheck(): Promise<void> {
    const terminal = vscode.window.createTerminal('OxideKit i18n');
    terminal.show();
    terminal.sendText('oxide i18n check');
}

async function figmaImport(): Promise<void> {
    const terminal = vscode.window.createTerminal('OxideKit Figma');
    terminal.show();
    terminal.sendText('oxide figma import');
}

async function restartLsp(): Promise<void> {
    if (client) {
        await client.stop();
        await client.start();
        vscode.window.showInformationMessage('OxideKit language server restarted');
    }
}

async function showPreview(): Promise<void> {
    // Create webview panel for live preview
    const panel = vscode.window.createWebviewPanel(
        'oxidekitPreview',
        'OxideKit Preview',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
        }
    );

    panel.webview.html = getPreviewHtml();
}

async function showTokenExplorer(): Promise<void> {
    vscode.commands.executeCommand('workbench.view.extension.oxidekit-explorer');
}

async function createComponent(componentName?: string): Promise<void> {
    const name = componentName || await vscode.window.showInputBox({
        prompt: 'Enter component name',
        placeHolder: 'e.g., MyButton',
    });

    if (!name) return;

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    const componentsDir = path.join(workspaceFolders[0].uri.fsPath, 'src', 'components');
    const componentPath = path.join(componentsDir, `${name}.oui`);

    const content = `// ${name} component
app ${name} {
    Column {
        align: center
        justify: center

        Text {
            content: "${name} component"
        }
    }
}
`;

    const uri = vscode.Uri.file(componentPath);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
    await vscode.window.showTextDocument(uri);
}

async function extractComponent(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showWarningMessage('Select the component code to extract');
        return;
    }

    const componentName = await vscode.window.showInputBox({
        prompt: 'Enter name for extracted component',
        placeHolder: 'e.g., MyExtractedComponent',
    });

    if (!componentName) return;

    // This would need more sophisticated implementation
    vscode.window.showInformationMessage(`Extract to ${componentName} - not yet implemented`);
}

async function wrapWith(wrapper: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'oui') return;

    const selection = editor.selection;
    const text = editor.document.getText(selection);

    const wrapped = `${wrapper} {\n    ${text.split('\n').join('\n    ')}\n}`;

    await editor.edit(editBuilder => {
        editBuilder.replace(selection, wrapped);
    });
}

async function showMigrationGuide(componentId?: string): Promise<void> {
    const url = componentId
        ? `https://oxidekit.com/docs/migration/${componentId}`
        : 'https://oxidekit.com/docs/migration';

    vscode.env.openExternal(vscode.Uri.parse(url));
}

function getPreviewHtml(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OxideKit Preview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #0B0F14;
            color: #E5E7EB;
        }
        .placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 80vh;
            text-align: center;
        }
        .placeholder h2 {
            color: #9CA3AF;
            margin-bottom: 16px;
        }
        .placeholder p {
            color: #6B7280;
            max-width: 400px;
        }
    </style>
</head>
<body>
    <div class="placeholder">
        <h2>OxideKit Preview</h2>
        <p>Start the dev server to see live preview of your OxideKit application.</p>
        <p>Run "OxideKit: Start Dev Server" from the command palette.</p>
    </div>
</body>
</html>
`;
}

// Tree view providers

class ComponentsTreeProvider implements vscode.TreeDataProvider<ComponentItem> {
    getTreeItem(element: ComponentItem): vscode.TreeItem {
        return element;
    }

    getChildren(_element?: ComponentItem): Thenable<ComponentItem[]> {
        // Return list of components in the project
        return Promise.resolve([
            new ComponentItem('Built-in', vscode.TreeItemCollapsibleState.Collapsed),
        ]);
    }
}

class TokensTreeProvider implements vscode.TreeDataProvider<TokenItem> {
    getTreeItem(element: TokenItem): vscode.TreeItem {
        return element;
    }

    getChildren(_element?: TokenItem): Thenable<TokenItem[]> {
        return Promise.resolve([
            new TokenItem('Colors', vscode.TreeItemCollapsibleState.Collapsed),
            new TokenItem('Spacing', vscode.TreeItemCollapsibleState.Collapsed),
            new TokenItem('Radius', vscode.TreeItemCollapsibleState.Collapsed),
        ]);
    }
}

class I18nTreeProvider implements vscode.TreeDataProvider<I18nItem> {
    getTreeItem(element: I18nItem): vscode.TreeItem {
        return element;
    }

    getChildren(_element?: I18nItem): Thenable<I18nItem[]> {
        return Promise.resolve([
            new I18nItem('en (English)', vscode.TreeItemCollapsibleState.None),
        ]);
    }
}

class ComponentItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.iconPath = new vscode.ThemeIcon('symbol-class');
    }
}

class TokenItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.iconPath = new vscode.ThemeIcon('symbol-color');
    }
}

class I18nItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.iconPath = new vscode.ThemeIcon('globe');
    }
}
