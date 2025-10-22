import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const getActionColor = (action: string) => {
  switch (action) {
    case 'Create Task':
      return 'bg-success text-white';
    case 'Update Task':
      return 'bg-warning text-white';
    case 'Delete Task':
      return 'bg-destructive text-destructive-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export default function AuditLogs() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => fetchAuditLogs(page),
  });

  const renderUpdatedContent = (content: any) => {
    if (!content) return '—';
    
    if (typeof content === 'object') {
      return (
        <div className="space-y-1">
          {Object.entries(content).map(([key, value]) => (
            <div key={key} className="text-sm">
              <span className="font-medium">{key}:</span>{' '}
              <span className="text-muted-foreground">"{String(value)}"</span>
            </div>
          ))}
        </div>
      );
    }
    
    return String(content);
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Audit Logs</h3>
        <p className="text-sm text-muted-foreground">
          Track all create, update, and delete actions
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          Error loading audit logs. Please try again.
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">Timestamp</TableHead>
              <TableHead className="w-40">Action</TableHead>
              <TableHead className="w-24">Task ID</TableHead>
              <TableHead>Updated Content</TableHead>
              <TableHead className="w-32">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading audit logs...
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('font-medium', getActionColor(log.action))}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.task_id ? `#${log.task_id}` : '—'}
                  </TableCell>
                  <TableCell>{renderUpdatedContent(log.updated_content)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.notes || '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {data.data.length} of {data.total} logs
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>
            <span className="text-sm">
              Page {page} of {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
