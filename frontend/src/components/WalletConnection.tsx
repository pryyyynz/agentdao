"use client";

import { ConnectWallet, useAddress, useDisconnect } from "@thirdweb-dev/react";
import { Wallet, LogOut } from "lucide-react";

export function WalletConnection() {
  const address = useAddress();
  const disconnect = useDisconnect();

  if (address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
          <Wallet className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <button
          onClick={disconnect}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <ConnectWallet
      theme="light"
      btnTitle="Connect Wallet"
      modalTitle="Connect to Grantify"
      modalSize="compact"
      welcomeScreen={{
        title: "Welcome to Grantify",
        subtitle: "Connect your wallet to submit and view grant proposals",
      }}
    />
  );
}
