
import {
  AlertCircleIcon,
  CheckCircleIcon,
  PlusIcon,
  UnplugIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useState } from "react";
import { PLATFORMS } from "../assets/assets";

interface Account {
  _id: string;
  platform: string;
  handle: string;
  status: "connected" | "disconnected";
}

interface AccountListProps {
  account: Account[];
  onDisconnect: (accountId: string) => Promise<void>;
  onReconnect: (platform: string) => Promise<void>;
}

const AccountList = ({
  account,
  onDisconnect,
  onReconnect,
}: AccountListProps) => {
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [reconnectingPlatform, setReconnectingPlatform] = useState<string | null>(
    null
  );

  const handleDisconnect = async (accountId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to disconnect this account?"
    );

    if (!confirmed) return;

    try {
      setDisconnectingId(accountId);
      await onDisconnect(accountId);
    } catch (error) {
      console.error("Failed to disconnect account:", error);
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleReconnect = async (platform: string) => {
    try {
      setReconnectingPlatform(platform);
      await onReconnect(platform);
    } catch (error) {
      console.error("Failed to reconnect account:", error);
    } finally {
      setReconnectingPlatform(null);
    }
  };

  if (account.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-20 px-6">
        <div className="size-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
          <PlusIcon className="size-6 text-slate-500 opacity-50" />
        </div>

        <p className="text-slate-700 text-lg">No account connected</p>

        <p className="text-sm text-slate-400 mt-1 max-w-xs text-center">
          Connect your first social platform to start scheduling and automating
          your content.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {account.map((item) => {
        const meta = PLATFORMS.find(
          (platform) => platform.id === item.platform
        );

        if (!meta) return null;

        const isConnected = item.status === "connected";
        const isDisconnecting = disconnectingId === item._id;
        const isReconnecting = reconnectingPlatform === item.platform;

        return (
          <div
            key={item._id}
            className="group bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 hover:border-slate-300 transition-all"
          >
            <div className="size-12 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
              <meta.icon className="size-6 text-slate-500" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-slate-900 truncate">{item.handle}</div>
              <div className="text-sm text-slate-500 mt-0.5">
                {meta.name}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isConnected ? (
                <>
                  <CheckCircleIcon className="size-4 text-emerald-500" />
                  <span className="text-xs text-emerald-600">Connected</span>
                </>
              ) : (
                <>
                  <AlertCircleIcon className="size-4 text-amber-500" />
                  <span className="text-xs text-amber-600">Disconnected</span>
                </>
              )}
            </div>

            {isConnected ? (
              <button
                type="button"
                onClick={() => handleDisconnect(item._id)}
                disabled={isDisconnecting}
                title="Disconnect account"
                aria-label={`Disconnect ${meta.name} account`}
                className="ml-2 p-1.5 rounded-lg text-slate-300 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <UnplugIcon
                  className={`size-4 ${
                    isDisconnecting ? "animate-pulse" : ""
                  }`}
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleReconnect(item.platform)}
                disabled={isReconnecting}
                className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <RefreshCwIcon
                  className={`size-3.5 ${
                    isReconnecting ? "animate-spin" : ""
                  }`}
                />
                {isReconnecting ? "Connecting..." : "Connect Again"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AccountList;
