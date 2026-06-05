import React from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  title?: string;
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  actions?: React.ReactNode;
}

export function DataTable<T extends { id: string | number }>({
  title,
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data available',
  actions,
}: DataTableProps<T>) {
  const getNestedValue = (obj: T, path: string): any => {
    return path.split('.').reduce((acc: any, part) => acc?.[part], obj);
  };

  return (
    <Card className="border-border/50 shadow-sm">
      {(title || actions) && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          {title && <CardTitle className="text-lg font-semibold">{title}</CardTitle>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {columns.map((column) => (
                  <TableHead
                    key={String(column.key)}
                    className={column.className}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-muted-foreground">Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={String(column.key)}
                        className={column.className}
                      >
                        {column.render
                          ? column.render(row)
                          : String(getNestedValue(row, String(column.key)) ?? '')}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
