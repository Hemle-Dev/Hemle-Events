import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, KeyRound, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fetchMyAccess, fetchTeam } from "@/lib/admin";
import { normalizeIdentifier } from "@/lib/account";
import { ROLE_LABELS, type AppRole } from "@/lib/events";
import {
  changeTeamMemberPassword,
  createTeamMember,
  setTeamMemberActive,
  setTeamMemberRole,
} from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/admin/equipe")({ component: AdminTeam });

type NewMember = {
  identifier: string;
  password: string;
  nom: string;
  prenom: string;
  role: AppRole;
};
const EMPTY: NewMember = { identifier: "", password: "", nom: "", prenom: "", role: "editeur" };

function PasswordField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        minLength={12}
        maxLength={128}
        required
        autoComplete="new-password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pr-11"
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    </div>
  );
}

function AdminTeam() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newMember, setNewMember] = useState<NewMember>(EMPTY);
  const [passwordTarget, setPasswordTarget] = useState<{ id: string; label: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const access = useQuery({ queryKey: ["admin", "my-access"], queryFn: fetchMyAccess });
  const isAdmin = access.data?.roles.includes("administrateur") ?? false;
  const team = useQuery({ queryKey: ["admin", "team"], queryFn: fetchTeam, enabled: isAdmin });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin"] });

  const create = useMutation({
    mutationFn: () =>
      createTeamMember({
        data: { ...newMember, identifier: normalizeIdentifier(newMember.identifier) },
      }),
    onSuccess: () => {
      toast.success("Compte créé");
      setCreateOpen(false);
      setNewMember(EMPTY);
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const role = useMutation({
    mutationFn: ({ userId, nextRole }: { userId: string; nextRole: AppRole }) =>
      setTeamMemberRole({ data: { userId, role: nextRole } }),
    onSuccess: () => {
      toast.success("Rôle mis à jour");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const active = useMutation({
    mutationFn: ({ userId, actif }: { userId: string; actif: boolean }) =>
      setTeamMemberActive({ data: { userId, actif } }),
    onSuccess: () => {
      toast.success("Accès mis à jour");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const password = useMutation({
    mutationFn: () =>
      changeTeamMemberPassword({ data: { userId: passwordTarget!.id, password: newPassword } }),
    onSuccess: () => {
      toast.success("Mot de passe modifié");
      setPasswordTarget(null);
      setNewPassword("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (access.isLoading)
    return <p className="text-sm text-muted-foreground">Vérification des droits…</p>;
  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <ShieldCheck className="size-8 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-bold">Accès administrateur requis</h1>
        <p className="mt-2 text-muted-foreground">
          Seuls les administrateurs peuvent gérer les comptes et les mots de passe.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <div>
          <p className="eyebrow">Accès</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Équipe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Créez les identifiants, attribuez les rôles et contrôlez les accès.
          </p>
        </div>
        <Button className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden="true" /> Nouveau compte
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {(team.data ?? []).map((member) => {
            const memberRole = member.roles[0] ?? "editeur";
            const isSelf = member.id === access.data?.user?.id;
            return (
              <li
                key={member.id}
                className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_220px_150px_auto] lg:items-center"
              >
                <div>
                  <p className="font-medium">
                    {[member.prenom, member.nom].filter(Boolean).join(" ") || member.identifiant}
                  </p>
                  <p className="font-mono text-sm text-muted-foreground">{member.identifiant}</p>
                </div>
                <Select
                  value={memberRole}
                  disabled={role.isPending || isSelf}
                  onValueChange={(value) =>
                    role.mutate({ userId: member.id, nextRole: value as AppRole })
                  }
                >
                  <SelectTrigger aria-label={`Rôle de ${member.identifiant}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={member.actif}
                    disabled={active.isPending || isSelf}
                    onCheckedChange={(checked) =>
                      active.mutate({ userId: member.id, actif: checked })
                    }
                    aria-label={`${member.actif ? "Désactiver" : "Activer"} ${member.identifiant}`}
                  />
                  <span className="text-sm">{member.actif ? "Actif" : "Désactivé"}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPasswordTarget({ id: member.id, label: member.identifiant ?? "ce compte" })
                  }
                >
                  <KeyRound aria-hidden="true" /> Mot de passe
                </Button>
              </li>
            );
          })}
          {team.isLoading ? (
            <li className="px-5 py-6 text-sm text-muted-foreground">Chargement…</li>
          ) : null}
        </ul>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau compte</DialogTitle>
            <DialogDescription>
              Aucune adresse email n’est nécessaire. Communiquez l’identifiant et le mot de passe
              par un canal sûr.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="member-firstname">Prénom</Label>
                <Input
                  id="member-firstname"
                  required
                  value={newMember.prenom}
                  onChange={(event) => setNewMember({ ...newMember, prenom: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-lastname">Nom</Label>
                <Input
                  id="member-lastname"
                  required
                  value={newMember.nom}
                  onChange={(event) => setNewMember({ ...newMember, nom: event.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-identifier">Identifiant</Label>
              <Input
                id="member-identifier"
                required
                minLength={3}
                value={newMember.identifier}
                onChange={(event) =>
                  setNewMember({
                    ...newMember,
                    identifier: normalizeIdentifier(event.target.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Minuscules, chiffres, points, tirets ou underscores.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-password">Mot de passe initial</Label>
              <PasswordField
                id="member-password"
                value={newMember.password}
                onChange={(value) => setNewMember({ ...newMember, password: value })}
              />
              <p className="text-xs text-muted-foreground">
                12 caractères minimum. L’administrateur pourra le remplacer plus tard.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-role">Rôle</Label>
              <Select
                value={newMember.role}
                onValueChange={(value) => setNewMember({ ...newMember, role: value as AppRole })}
              >
                <SelectTrigger id="member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Création…" : "Créer le compte"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={passwordTarget !== null}
        onOpenChange={(openState) => !openState && setPasswordTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le mot de passe</DialogTitle>
            <DialogDescription>
              Nouveau mot de passe pour <strong>{passwordTarget?.label}</strong>. Cette action est
              réservée aux administrateurs.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              password.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <PasswordField id="new-password" value={newPassword} onChange={setNewPassword} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPasswordTarget(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={password.isPending}>
                {password.isPending ? "Modification…" : "Modifier"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
