"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAddress, useDisconnect } from "@thirdweb-dev/react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { User, Wallet, Edit2, Save, X, Link2, Unlink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { user, linkWallet, unlinkWallet, updateProfile } = useAuth();
  const address = useAddress();
  const { disconnect } = useDisconnect();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        display_name: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      setIsEditing(false);
    } catch (error) {
      // Error handled by toast
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(user?.display_name || "");
    setBio(user?.bio || "");
    setIsEditing(false);
  };

  const handleLinkWallet = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsLinking(true);
    try {
      await linkWallet(address);
      // Success - no need to update local state, linkWallet updates user context
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkWallet = async () => {
    setIsLinking(true);
    try {
      await unlinkWallet();
      disconnect();
    } catch (error) {
      // Error handled by toast
    } finally {
      setIsLinking(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              ) : (
                <p className="px-4 py-2 text-gray-900">
                  {user.display_name || "Not set"}
                </p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              {isEditing ? (
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              ) : (
                <p className="px-4 py-2 text-gray-900 whitespace-pre-wrap">
                  {user.bio || "No bio yet"}
                </p>
              )}
            </div>

            {/* Wallet Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Wallet className="inline h-4 w-4 mr-2" />
                Wallet Address
              </label>
              {user.wallet_address ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono">
                      {user.wallet_address}
                    </code>
                    <button
                      onClick={handleUnlinkWallet}
                      disabled={isLinking}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isLinking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unlink className="h-4 w-4" />
                      )}
                      Unlink
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Your wallet is linked. Grants submitted with this address are automatically associated with your account.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {address ? (
                    <button
                      onClick={handleLinkWallet}
                      disabled={isLinking}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isLinking ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Linking...
                        </>
                      ) : (
                        <>
                          <Link2 className="h-4 w-4" />
                          Link Current Wallet
                        </>
                      )}
                    </button>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Connect your wallet to link it to your account. This will automatically associate any existing grants with your address.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Account Info */}
            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">User ID</p>
                  <p className="font-mono text-gray-900">{user.user_id}</p>
                </div>
                {user.created_at && (
                  <div>
                    <p className="text-gray-500">Member Since</p>
                    <p className="text-gray-900">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {user.last_login_at && (
                  <div>
                    <p className="text-gray-500">Last Login</p>
                    <p className="text-gray-900">
                      {new Date(user.last_login_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

