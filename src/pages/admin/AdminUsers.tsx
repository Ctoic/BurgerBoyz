import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
  ApiAdminCreateUserPayload,
  ApiAdminUserListItem,
  ApiPaginatedResponse,
} from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Trash2 } from "lucide-react";
import PaginationFooter from "@/components/PaginationFooter";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
};

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ApiAdminUserListItem | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", currentPage, searchTerm],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: "10",
      });
      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      }
      return apiFetch<ApiPaginatedResponse<ApiAdminUserListItem>>(
        `/admin/users?${params.toString()}`,
      );
    },
  });
  const users = data?.items ?? [];

  const addUserMutation = useMutation({
    mutationFn: (payload: ApiAdminCreateUserPayload) =>
      apiFetch<ApiAdminUserListItem>("/admin/users", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setIsAddDialogOpen(false);
      setFormState(EMPTY_FORM);
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "User added",
        description: "The customer has been added to Burger Guys.",
      });
    },
    onError: (error) => {
      toast({
        title: "Unable to add user",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/admin/users/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      setDeleteTarget(null);
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "User deleted",
        description: "The user was removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Unable to delete user",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const handleAddUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = formState.email.trim().toLowerCase();
    const name = formState.name.trim();
    const phone = formState.phone.trim();

    if (!email) {
      toast({
        title: "Email required",
        description: "Please provide a valid email address.",
      });
      return;
    }

    addUserMutation.mutate({
      email,
      ...(name ? { name } : {}),
      ...(phone ? { phone } : {}),
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-brand-yellow/60 bg-gradient-to-r from-primary/20 via-brand-orange/10 to-background p-5 shadow-[var(--shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-black/70">
          Burger Guys Admin
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl leading-none">
              <span className="text-brand-black">BURGER</span>{" "}
              <span className="text-primary">GUYS</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Customer Directory</p>
          </div>
          <Button
            className="btn-order h-10 gap-2 px-5 py-0"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter users by name, email, or phone"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-10 pl-9"
            />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {data?.totalItems ?? 0} user{(data?.totalItems ?? 0) === 1 ? "" : "s"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 text-xs uppercase tracking-wide">Name</TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wide">Email</TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wide">Phone</TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wide text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-semibold text-foreground">
                      {user.name?.trim() ? user.name : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.phone?.trim() ? user.phone : "Not provided"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-8 rounded-full px-3"
                        onClick={() => setDeleteTarget(user)}
                        disabled={deleteUserMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    {searchTerm.trim()
                      ? "No users match your filter."
                      : "No users yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {!isLoading && data ? (
          <PaginationFooter
            currentPage={data.page}
            totalPages={data.totalPages}
            totalItems={data.totalItems}
            startItem={data.totalItems === 0 ? 0 : (data.page - 1) * data.pageSize + 1}
            endItem={Math.min(data.page * data.pageSize, data.totalItems)}
            label="user"
            onPageChange={setCurrentPage}
          />
        ) : null}
      </div>

      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open && !addUserMutation.isPending) {
            setFormState(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="w-[92vw] max-w-lg rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl text-foreground">Add User</DialogTitle>
            <DialogDescription>
              Add a new customer to the Burger Guys user list.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleAddUser}>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</p>
              <Input
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="e.g. Hamza Khan"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Email
              </p>
              <Input
                type="email"
                required
                value={formState.email}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="customer@email.com"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</p>
              <Input
                value={formState.phone}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, phone: event.target.value }))
                }
                placeholder="+1 555 555 5555"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={addUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn-order px-6"
                disabled={addUserMutation.isPending}
              >
                {addUserMutation.isPending ? "Adding..." : "Add User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteUserMutation.isPending) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl border border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteTarget?.email ?? "this user"} from Burger Guys. Any linked
              orders will remain in history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (!deleteTarget) return;
                deleteUserMutation.mutate(deleteTarget.id);
              }}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
