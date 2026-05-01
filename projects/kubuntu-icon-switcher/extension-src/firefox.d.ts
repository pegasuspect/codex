declare namespace browser.runtime {
  interface Port {
    onDisconnect: {
      addListener(listener: () => void): void;
    };
    postMessage(message: unknown): void;
  }

  interface MessageSender {
    tab?: unknown;
  }

  const onMessage: {
    addListener(listener: (message: unknown, sender?: MessageSender) => void | Promise<void>): void;
  };

  function connectNative(name: string): Port;
  function sendMessage(message: unknown): Promise<unknown>;
}

declare const browser: {
  runtime: typeof browser.runtime;
};
