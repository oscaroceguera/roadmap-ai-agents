import type { Component, MarkdownTheme } from "@earendil-works/pi-tui";
import {
  Editor,
  Key,
  Loader,
  Markdown,
  matchesKey,
  ProcessTerminal,
  TuiMainScreen,
  truncateToWidth,
  visibleWidth,
} from "@earendil-works/pi-tui";
import type { ModelMessage } from "ai";
import chalk from "chalk";

export const uiTheme = {
  borderColor: chalk.green,
  selectList: {
    selectedPrefix: (s: string) => chalk.cyan.bold(s),
    selectedText: chalk.cyan,
    description: chalk.gray,
    scrollInfo: chalk.gray,
    noMatch: chalk.red,
  },
};

export const mdTheme: MarkdownTheme = {
  heading: (s) => chalk.bold.cyan(s),
  link: (s) => chalk.blue(s),
  linkUrl: (s) => chalk.dim(s),
  code: (s) => chalk.yellow(s),
  codeBlock: (s) => chalk.green(s),
  codeBlockBorder: (s) => chalk.dim(s),
  quote: (s) => chalk.italic(s),
  quoteBorder: (s) => chalk.dim(s),
  hr: (s) => chalk.dim(s),
  listBullet: (s) => chalk.cyan(s),
  bold: (s) => chalk.bold(s),
  italic: (s) => chalk.italic(s),
  strikethrough: (s) => chalk.strikethrough(s),
  underline: (s) => chalk.underline(s),
};

export class AgentUI implements Component {
  private readonly history: ModelMessage[];
  private tui = new TuiMainScreen(new ProcessTerminal());
  private editor = new Editor(this.tui, uiTheme, { paddingX: 1 });
  private thinkingLoader: Loader | null = null;
  private currentAction = "";
  private mdCache = new Map<ModelMessage, Markdown>();

  onInput?: (text: string) => Promise<void>;

  constructor(history: ModelMessage[]) {
    this.history = history;
    this.tui.addChild(this);
    this.tui.addChild(this.editor);

    this.editor.onSubmit = (text) => {
      if (this.thinkingLoader) return;
      if (text.trim()) this.onInput?.(text);
    };

    this.tui.addInputListener((d) => {
      if (matchesKey(d, Key.ctrl("c"))) this.exit();
      return undefined;
    });

    process.on("SIGINT", () => this.exit()).on("SIGTERM", () => this.exit());
  }

  start() {
    this.tui.start();
    this.editor.focused = true;
    this.tui.setFocus(this.editor);
  }

  exit() {
    this.tui.stop();
    process.exit(0);
  }

  appendSpacer(lines: string[]) {
    if (lines.length > 0) lines.push("");
  }

  colorMessage(m: ModelMessage) {
    return m.role === "user" ? chalk.green : chalk.white;
  }

  renderAssistantMessage(m: ModelMessage, w: number) {
    let md = this.mdCache.get(m);
    if (!md) {
      md = new Markdown(this.getMessageText(m), 2, 0, mdTheme);
      this.mdCache.set(m, md);
    }
    return md.render(w);
  }

  renderPlainMessage(m: ModelMessage) {
    const message = this.getMessageText(m);
    return message.split("\n").map((l) => `  ${this.colorMessage(m)(l)}`);
  }

  renderMessage(m: ModelMessage, w: number) {
    return m.role === "assistant"
      ? this.renderAssistantMessage(m, w)
      : this.renderPlainMessage(m);
  }

  appendThinking(lines: string[], w: number) {
    if (!this.thinkingLoader) return;
    this.appendSpacer(lines);
    lines.push(...this.thinkingLoader.render(w));
    if (this.currentAction) {
      lines.push(`\t${chalk.dim("↳")} ${chalk.gray(this.currentAction)}`);
    }
  }

  fitWidth(lines: string[], w: number) {
    return lines.map((l) => (visibleWidth(l) > w ? truncateToWidth(l, w) : l));
  }

  getMessageText(m: ModelMessage): string {
    if (typeof m.content === "string") return m.content;
    return m.content.map((part) => ("text" in part ? part.text : "")).join("");
  }

  push(m: ModelMessage) {
    this.history.push(m);
    this.tui.requestRender();
    this.editor.setText("");
  }

  setActionStatus(action: string) {
    this.currentAction = action;
    this.tui.requestRender();
  }

  clearActionStatus() {
    this.currentAction = "";
  }

  makeSpinner() {
    return new Loader(this.tui, chalk.cyan, chalk.dim, "Thinking...");
  }

  invalidate() {}

  render(w: number) {
    const lines: string[] = [];
    for (const m of this.history) {
      this.appendSpacer(lines);
      lines.push(...this.renderMessage(m, w));
    }
    this.appendThinking(lines, w);
    return this.fitWidth(lines, w);
  }

  async think<T>(fn: () => Promise<T>) {
    this.thinkingLoader = this.makeSpinner();
    this.clearActionStatus();
    try {
      const reply = await fn();
      this.thinkingLoader = null;
      return reply;
    } catch (e) {
      this.thinkingLoader = null;
      this.history.push({
        role: "assistant",
        content: `🔴 Error: ${e instanceof Error ? e.message : String(e)}`,
      });
    } finally {
      this.clearActionStatus();
    }
  }
}
