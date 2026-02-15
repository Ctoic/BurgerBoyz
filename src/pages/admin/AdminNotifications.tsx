import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ApiAdminNotificationItem, ApiPaginatedResponse } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BellRing, RotateCw, Send } from "lucide-react";
import PaginationFooter from "@/components/PaginationFooter";

const AdminNotifications = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-notifications", currentPage],
    queryFn: () =>
      apiFetch<ApiPaginatedResponse<ApiAdminNotificationItem>>(
        `/admin/notifications?page=${currentPage}&pageSize=10`,
      ),
  });
  const notifications = data?.items ?? [];

  const sendNotificationMutation = useMutation({
    mutationFn: (payload: { title: string; description: string }) =>
      apiFetch<ApiAdminNotificationItem>("/admin/notifications", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      setCurrentPage(1);
      setTitle("");
      setDescription("");
      setIsDialogOpen(false);
      toast({
        title: "Notification sent",
        description: "Push notification was queued and added to history.",
      });
    },
    onError: (error) => {
      toast({
        title: "Unable to send notification",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const resendNotificationMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<ApiAdminNotificationItem>(`/admin/notifications/${id}/resend`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast({
        title: "Notification resent",
        description: "The selected notification was pushed again.",
      });
    },
    onError: (error) => {
      toast({
        title: "Unable to resend",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
    onSettled: () => {
      setResendingId(null);
    },
  });
  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!cleanTitle || !cleanDescription) {
      toast({
        title: "Title and description required",
        description: "Provide both fields before sending.",
      });
      return;
    }

    sendNotificationMutation.mutate({
      title: cleanTitle,
      description: cleanDescription,
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-primary/40 bg-gradient-to-r from-primary/20 via-secondary/15 to-background p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-black/70">
              Admin Push Center
            </p>
            <h1 className="mt-2 font-display text-4xl text-foreground">Notifications</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Send and resend push notifications to your customers.
            </p>
          </div>
          <Button className="btn-order h-10 gap-2 px-5 py-0" onClick={() => setIsDialogOpen(true)}>
            <BellRing className="h-4 w-4" />
            Add Notification
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
          Sent notifications: <span className="font-semibold text-foreground">{data?.totalItems ?? 0}</span>
        </div>
        <div className="overflow-x-auto p-4">
          <Table className="min-w-[880px]">
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 text-xs uppercase tracking-wide">Title</TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wide">Description</TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wide">Date Sent</TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wide text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    Loading notifications...
                  </TableCell>
                </TableRow>
              ) : notifications.length > 0 ? (
                notifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="font-semibold text-foreground">{notification.title}</TableCell>
                    <TableCell className="max-w-[420px] text-muted-foreground">
                      {notification.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div>{new Date(notification.sentAt).toLocaleString()}</div>
                      <div className="text-xs">
                        Sent {notification.sendCount} time{notification.sendCount === 1 ? "" : "s"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full px-3"
                        onClick={() => {
                          setResendingId(notification.id);
                          resendNotificationMutation.mutate(notification.id);
                        }}
                        disabled={resendNotificationMutation.isPending}
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        {resendingId === notification.id ? "Resending..." : "Resend"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No notifications sent yet.
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
            label="notification"
            onPageChange={setCurrentPage}
          />
        ) : null}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[92vw] max-w-lg rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl text-foreground">Add Notification</DialogTitle>
            <DialogDescription>
              Add heading and description, then send it as a push notification.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Heading
              </p>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Flash Deal is Live"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="e.g. 20% off all burgers for the next 2 hours."
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={sendNotificationMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="btn-order gap-2 px-6"
                disabled={sendNotificationMutation.isPending}
              >
                <Send className="h-4 w-4" />
                {sendNotificationMutation.isPending ? "Sending..." : "Send Notification"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminNotifications;
