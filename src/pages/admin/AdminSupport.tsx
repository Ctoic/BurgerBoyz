import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
  ApiPaginatedSupportThreadsResponse,
  SupportMessage,
  SupportThreadSummary,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import PaginationFooter from "@/components/PaginationFooter";

const AdminSupport = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const lastReadRef = useRef<Record<string, string>>({});

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const threadsQuery = useQuery({
    queryKey: ["admin-support-threads", currentPage, searchTerm],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: "10",
      });
      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      }
      return apiFetch<ApiPaginatedSupportThreadsResponse>(
        `/admin/support/threads?${params.toString()}`,
      );
    },
    refetchInterval: 5000,
  });
  const threads = threadsQuery.data?.items ?? [];

  const activeThreadQuery = useQuery({
    queryKey: ["admin-support-thread", activeThreadId],
    queryFn: () => apiFetch<{ messages: SupportMessage[]; user: SupportThreadSummary["user"] }>(`/admin/support/threads/${activeThreadId}`),
    enabled: Boolean(activeThreadId),
    refetchInterval: activeThreadId ? 5000 : false,
  });

  const markReadMutation = useMutation({
    mutationFn: (threadId: string) =>
      apiFetch(`/admin/support/threads/${threadId}/read`, { method: "POST" }),
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/admin/support/threads/${activeThreadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: messageBody }),
      }),
    onSuccess: () => {
      setMessageBody("");
      activeThreadQuery.refetch();
      threadsQuery.refetch();
    },
  });

  useEffect(() => {
    if (!activeThreadId || !threadsQuery.data) return;
    const thread = threads.find((item) => item.id === activeThreadId);
    if (!thread || thread.unreadCount === 0) return;
    if (lastReadRef.current[thread.id] === thread.updatedAt) return;
    markReadMutation.mutate(thread.id, {
      onSuccess: () => {
        lastReadRef.current[thread.id] = thread.updatedAt;
        threadsQuery.refetch();
      },
    });
  }, [activeThreadId, threads, threadsQuery.data, markReadMutation, threadsQuery]);

  const activeMessages = activeThreadQuery.data?.messages ?? [];
  const activeUser = activeThreadQuery.data?.user;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Customer Support</h1>
        <p className="text-sm text-muted-foreground">Chat with your customers.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customers"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-10 pl-9"
            />
          </div>

          <ScrollArea className="h-[520px] pr-2">
            <div className="space-y-2">
              {threadsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading threads...</p>
              ) : threads.length > 0 ? (
                threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setActiveThreadId(thread.id)}
                    className={[
                      "w-full rounded-2xl border border-border px-4 py-3 text-left transition",
                      activeThreadId === thread.id
                        ? "bg-primary/10"
                        : "bg-background hover:bg-muted/40",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {thread.user.name ?? thread.user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">{thread.user.email}</p>
                      </div>
                      {thread.unreadCount > 0 && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                    {thread.lastMessage && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                        {thread.lastMessage.body}
                      </p>
                    )}
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
              )}
            </div>
          </ScrollArea>
          {!threadsQuery.isLoading && threadsQuery.data ? (
            <PaginationFooter
              currentPage={threadsQuery.data.page}
              totalPages={threadsQuery.data.totalPages}
              totalItems={threadsQuery.data.totalItems}
              startItem={
                threadsQuery.data.totalItems === 0
                  ? 0
                  : (threadsQuery.data.page - 1) * threadsQuery.data.pageSize + 1
              }
              endItem={Math.min(
                threadsQuery.data.page * threadsQuery.data.pageSize,
                threadsQuery.data.totalItems,
              )}
              label="conversation"
              onPageChange={setCurrentPage}
            />
          ) : null}
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          {activeThreadId ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-border pb-4">
                <h2 className="font-display text-2xl text-foreground">
                  {activeUser?.name ?? activeUser?.email}
                </h2>
                <p className="text-sm text-muted-foreground">{activeUser?.email}</p>
              </div>

              <ScrollArea className="flex-1 py-4 pr-2">
                <div className="space-y-3">
                  {activeMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages yet.</p>
                  ) : (
                    activeMessages.map((message) => (
                      <div
                        key={message.id}
                        className={[
                          "flex",
                          message.sender === "ADMIN" ? "justify-end" : "justify-start",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "max-w-[70%] rounded-2xl px-4 py-2 text-sm",
                            message.sender === "ADMIN"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground",
                          ].join(" ")}
                        >
                          {message.body}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="mt-4 flex items-center gap-3">
                <Input
                  placeholder="Type a reply..."
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                  className="h-11 rounded-full"
                />
                <Button
                  className="btn-order rounded-full px-6"
                  onClick={() => sendMutation.mutate()}
                  disabled={!messageBody.trim() || sendMutation.isPending}
                >
                  Send
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a conversation to view messages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;
