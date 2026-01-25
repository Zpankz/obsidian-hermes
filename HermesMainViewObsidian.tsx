import React from 'react';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import App from './App';
import './styles.css';

export const VIEW_TYPE_HERMES = 'hermes-voice-assistant';

export class HermesMainViewObsidian extends ItemView {
  private root: Root | null = null;
  private appRef: React.RefObject<any> = React.createRef();

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_HERMES;
  }

  getDisplayText(): string {
    return 'Hermes Voice Assistant';
  }

  getIcon(): string {
    return 'mic-vocal';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    const mount = container.createDiv({ cls: 'hermes-root obsidian' });
    this.root = createRoot(mount);
    this.root.render(
      <React.StrictMode>
        <App ref={this.appRef} />
      </React.StrictMode>
    );
  }

  async onClose(): Promise<void> {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }

  // Expose start session method for command palette
  async startSession() {
    if (this.appRef.current && this.appRef.current.startSession) {
      this.appRef.current.startSession();
    }
  }

  // Expose stop session method for command palette
  async stopSession() {
    if (this.appRef.current && this.appRef.current.stopSession) {
      this.appRef.current.stopSession();
    }
  }

  // Expose toggle session method for command palette
  async toggleSession() {
    if (this.appRef.current && this.appRef.current.toggleSession) {
      this.appRef.current.toggleSession();
    }
  }
}