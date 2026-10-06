import { useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Download, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Avatar } from "@/components/common/Avatar";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useAuthStore } from "@/stores/authStore";
import { profileUpdateSchema, type ProfileUpdateValues } from "@/lib/validation";
import { normalizeFacebookUrl } from "@/lib/validation";
import { supabase, friendlyError } from "@/lib/supabase";
import { fetchMyFullData } from "@/lib/userDataApi";
import { downloadTextFile } from "@/lib/utils";

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuthStore();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileUpdateValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      displayName: profile?.display_name ?? "",
      nickname: profile?.nickname ?? "",
      facebookUrl: profile?.facebook_url ?? "",
    },
  });

  if (!user || !profile) return null;
  const userId = user.id;

  async function onSaveProfile(values: ProfileUpdateValues) {
    setSavingProfile(true);
    try {
      const facebook = values.facebookUrl ? normalizeFacebookUrl(values.facebookUrl) : null;
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: values.displayName, nickname: values.nickname || null, facebook_url: facebook })
        .eq("id", userId);
      if (error) throw error;
      await refreshProfile();
      toast.success("Saved. 💗");
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function onAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl.publicUrl }).eq("id", userId);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile picture updated. 💗");
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setAvatarUploading(false);
    }
  }

  async function onChangePassword() {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError("Please choose at least 8 characters.");
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated. 💗");
      setNewPassword("");
    } catch (err) {
      setPasswordError(friendlyError(err));
    } finally {
      setChangingPassword(false);
    }
  }

  async function onDownloadData() {
    setExporting(true);
    try {
      const data = await fetchMyFullData(userId);
      downloadTextFile(`my-data-${userId}.json`, JSON.stringify(data, null, 2));
      toast.success("Your data is ready. 💗");
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setExporting(false);
    }
  }

  async function onDeleteAccount() {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
      window.location.href = "/";
    } catch (err) {
      toast.error(friendlyError(err, "We couldn't delete your account automatically. Please message the admin."));
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-6">
      <h1 className="font-serif-romantic text-3xl font-semibold text-ink">Your Profile</h1>

      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-border bg-surface/60 p-5">
        <Avatar name={profile.display_name} src={profile.avatar_url} size={64} online={profile.is_online} />
        <div className="flex-1">
          <p className="font-medium text-ink">{profile.display_name}</p>
          <p className="text-sm text-ink-soft">{profile.email}</p>
          <label className="mt-2 inline-block cursor-pointer text-sm text-primary hover:underline">
            {avatarUploading ? "Uploading..." : "Change photo"}
            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => void onAvatarChange(e)} disabled={avatarUploading} />
          </label>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-border bg-surface/50 p-3">
          <p className="text-ink-soft">Joined</p>
          <p className="font-medium text-ink">{format(new Date(profile.created_at), "MMM d, yyyy")}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface/50 p-3">
          <p className="text-ink-soft">Status</p>
          <p className="font-medium text-ink">{profile.is_online ? "Online" : "Offline"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSaveProfile)} className="mt-6 space-y-4 rounded-2xl border border-border bg-surface/60 p-5" noValidate>
        <h2 className="font-serif-romantic text-xl text-ink">Edit Details</h2>
        <div>
          <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-ink">
            Display Name
          </label>
          <input id="displayName" className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-ink outline-none focus:border-gold" {...register("displayName")} />
          {errors.displayName && <p className="mt-1 text-sm text-error">{errors.displayName.message}</p>}
        </div>
        <div>
          <label htmlFor="nickname" className="mb-1 block text-sm font-medium text-ink">
            Nickname / "friends call me"
          </label>
          <input id="nickname" className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-ink outline-none focus:border-gold" {...register("nickname")} />
        </div>
        <div>
          <label htmlFor="facebookUrl" className="mb-1 block text-sm font-medium text-ink">
            Facebook
          </label>
          <input id="facebookUrl" placeholder="facebook.com/username" className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-ink outline-none focus:border-gold" {...register("facebookUrl")} />
        </div>
        <Button type="submit" isLoading={savingProfile}>
          Save Changes
        </Button>
      </form>

      <div className="mt-6 space-y-4 rounded-2xl border border-border bg-surface/60 p-5">
        <h2 className="flex items-center gap-2 font-serif-romantic text-xl text-ink">
          <KeyRound className="h-5 w-5" /> Change Password
        </h2>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password"
          className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-ink outline-none focus:border-gold"
        />
        {passwordError && <p className="text-sm text-error">{passwordError}</p>}
        <Button onClick={() => void onChangePassword()} isLoading={changingPassword} variant="secondary">
          Update Password
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif-romantic text-xl text-ink">Download My Data</h2>
          <p className="text-sm text-ink-soft">Get a copy of your profile, answers, and messages.</p>
        </div>
        <Button variant="secondary" onClick={() => void onDownloadData()} isLoading={exporting}>
          <Download className="h-4 w-4" /> Download
        </Button>
      </div>

      <div className="mt-6 rounded-2xl border border-error/30 bg-error/5 p-5">
        <h2 className="flex items-center gap-2 font-serif-romantic text-xl text-error">
          <Trash2 className="h-5 w-5" /> Delete My Account
        </h2>
        <p className="mt-1 text-sm text-ink-soft">This action cannot be easily undone.</p>
        <Button variant="danger" className="mt-3" onClick={() => setDeleteOpen(true)}>
          Delete my account
        </Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Are you absolutely sure?"
        description={
          "This action cannot be easily undone.\n\nYour profile, responses, and conversations may be permanently removed.\n\nType DELETE below is not required here, but please be certain."
        }
        confirmLabel={deleting ? "Deleting..." : "Yes, delete everything"}
        danger
        isLoading={deleting}
        onConfirm={() => void onDeleteAccount()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
