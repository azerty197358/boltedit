export type ActionType = 'file' | 'shell' | 'start';

export interface ParsedAction {
  id: string;
  type: ActionType;
  filePath?: string;
  command?: string;
  content: string;
  done: boolean;
}

export interface ArtifactEvent {
  type: 'artifact-start' | 'action-start' | 'action-delta' | 'action-end' | 'artifact-end';
  artifactId?: string;
  artifactTitle?: string;
  action?: ParsedAction;
  delta?: string;
}

export interface ParserState {
  artifactId: string | null;
  artifactTitle: string | null;
  actions: ParsedAction[];
}

type Callback = (event: ArtifactEvent) => void;

interface CurrentAction {
  action: ParsedAction;
  contentBuffer: string;
}

let actionCounter = 0;
function nextActionId(): string {
  actionCounter += 1;
  return `action-${actionCounter}`;
}

export function resetActionCounter(): void {
  actionCounter = 0;
}

export class StreamingParser {
  private buffer = '';
  private callback: Callback;
  private currentArtifact: { id: string; title: string } | null = null;
  private currentAction: CurrentAction | null = null;
  private done = false;

  constructor(callback: Callback) {
    this.callback = callback;
  }

  feed(chunk: string): void {
    if (this.done) return;
    this.buffer += chunk;
    this.process();
  }

  end(): void {
    if (this.done) return;
    // Flush any open action and artifact.
    this.closeCurrentAction();
    this.closeCurrentArtifact();
    this.done = true;
  }

  private process(): void {
    while (this.buffer.length > 0 && !this.done) {
      if (this.currentAction) {
        const endIdx = this.buffer.indexOf('</boltAction>');
        if (endIdx === -1) {
          // No close tag yet — emit everything as delta except a possible
          // trailing partial-tag fragment we must hold back.
          const safe = this.stripTrailingPartialClose(this.buffer);
          if (safe.length > 0) {
            this.currentAction.contentBuffer += safe;
            this.currentAction.action.content += safe;
            this.callback({
              type: 'action-delta',
              artifactId: this.currentArtifact?.id,
              action: this.currentAction.action,
              delta: safe,
            });
          }
          const held = this.buffer.slice(safe.length);
          this.buffer = held;
          return;
        }
        // Full close tag found — emit content up to it.
        const content = this.buffer.slice(0, endIdx);
        if (content.length > 0) {
          this.currentAction.contentBuffer += content;
          this.currentAction.action.content += content;
          this.callback({
            type: 'action-delta',
            artifactId: this.currentArtifact?.id,
            action: this.currentAction.action,
            delta: content,
          });
        }
        this.buffer = this.buffer.slice(endIdx + '</boltAction>'.length);
        this.closeCurrentAction();
        continue;
      }

      // Not inside an action — look for the next opening tag.
      if (!this.currentArtifact) {
        const startIdx = this.buffer.indexOf('<boltArtifact');
        if (startIdx === -1) {
          // Drop leading non-tag text (fluff / preamble) up to a safe point.
          const safe = this.stripTrailingPartialOpen(this.buffer, '<boltArtifact');
          this.buffer = this.buffer.slice(safe.length);
          if (this.buffer.length === 0) return;
          continue;
        }
        // Drop any fluff before the artifact.
        this.buffer = this.buffer.slice(startIdx);
        this.openArtifact();
        continue;
      }

      // Inside an artifact, between actions.
      const actionIdx = this.buffer.indexOf('<boltAction');
      const artifactEndIdx = this.buffer.indexOf('</boltArtifact>');
      if (actionIdx === -1 && artifactEndIdx === -1) {
        const safe = this.stripTrailingPartialOpen(
          this.buffer,
          '<boltAction',
          '</boltArtifact>',
        );
        if (safe.length < this.buffer.length) {
          this.buffer = this.buffer.slice(safe.length);
          if (this.buffer.length === 0) return;
          continue;
        }
        return; // hold the whole buffer — partial tag
      }
      if (artifactEndIdx !== -1 && (actionIdx === -1 || artifactEndIdx < actionIdx)) {
        // Close artifact.
        this.buffer = this.buffer.slice(artifactEndIdx + '</boltArtifact>'.length);
        this.closeCurrentArtifact();
        continue;
      }
      // Open next action.
      this.buffer = this.buffer.slice(actionIdx);
      this.openAction();
      continue;
    }
  }

  private openArtifact(): void {
    const match = this.buffer.match(/^<boltArtifact\b[^>]*>/);
    if (!match) {
      // Incomplete tag — wait for more.
      this.done = this.done; // no-op, hold buffer
      return;
    }
    const tag = match[0];
    const idMatch = tag.match(/id="([^"]*)"/);
    const titleMatch = tag.match(/title="([^"]*)"/);
    const id = idMatch ? idMatch[1] : `artifact-${Date.now()}`;
    const title = titleMatch ? titleMatch[1] : 'Untitled Project';
    this.currentArtifact = { id, title };
    this.buffer = this.buffer.slice(tag.length);
    this.callback({
      type: 'artifact-start',
      artifactId: id,
      artifactTitle: title,
    });
  }

  private openAction(): void {
    const match = this.buffer.match(/^<boltAction\b[^>]*>/);
    if (!match) return; // incomplete, wait
    const tag = match[0];
    const typeMatch = tag.match(/type="([^"]*)"/);
    const filePathMatch = tag.match(/filePath="([^"]*)"/);
    const commandMatch = tag.match(/command="([^"]*)"/);
    const type = (typeMatch ? typeMatch[1] : 'file') as ActionType;
    const action: ParsedAction = {
      id: nextActionId(),
      type,
      filePath: filePathMatch ? filePathMatch[1] : undefined,
      command: commandMatch ? commandMatch[1] : undefined,
      content: '',
      done: false,
    };
    this.currentAction = { action, contentBuffer: '' };
    this.buffer = this.buffer.slice(tag.length);
    this.callback({
      type: 'action-start',
      artifactId: this.currentArtifact?.id,
      action,
    });
  }

  private closeCurrentAction(): void {
    if (!this.currentAction) return;
    this.currentAction.action.done = true;
    const action = this.currentAction.action;
    this.currentAction = null;
    this.callback({
      type: 'action-end',
      artifactId: this.currentArtifact?.id,
      action,
    });
  }

  private closeCurrentArtifact(): void {
    this.closeCurrentAction();
    if (!this.currentArtifact) return;
    const id = this.currentArtifact.id;
    this.currentArtifact = null;
    this.callback({ type: 'artifact-end', artifactId: id });
  }

  // Hold back trailing characters that could be the start of a close tag.
  private stripTrailingPartialClose(buf: string): string {
    const tag = '</boltAction>';
    for (let i = tag.length - 1; i >= 1; i--) {
      const frag = tag.slice(0, i);
      if (buf.endsWith(frag)) {
        return buf.slice(0, buf.length - frag.length);
      }
    }
    return buf;
  }

  // Hold back trailing characters that could be the start of an open tag.
  private stripTrailingPartialOpen(buf: string, ...tags: string[]): string {
    let cut = buf.length;
    for (const tag of tags) {
      for (let i = tag.length - 1; i >= 1; i--) {
        const frag = tag.slice(0, i);
        if (buf.endsWith(frag)) {
          cut = Math.min(cut, buf.length - frag.length);
        }
      }
    }
    return buf.slice(0, cut);
  }
}
