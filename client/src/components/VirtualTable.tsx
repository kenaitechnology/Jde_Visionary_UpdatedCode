import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { cn } from '@/lib/utils';

interface Column {
  key: string;
  header: string;
  width: string;
  render?: (item: any) => React.ReactNode;
}

interface VirtualTableProps {
  data: any[];
  columns: Column[];
  height?: number;
  rowHeight?: number;
  className?: string;
}

const VirtualTable: React.FC<VirtualTableProps> = ({
  data,
  columns,
  height = 400,
  rowHeight = 48,
  className
}) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <TableRow>
        {columns.map((column) => (
          <TableCell 
            key={column.key}
            className={column.width}
            style={{ width: column.width }}
          >
            {column.render 
              ? column.render(data[index]) 
              : data[index][column.key] || ''
            }
          </TableCell>
        ))}
      </TableRow>
    </div>
  );

  return (
    <div className={cn("w-full", className)}>
      <div className="overflow-hidden border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  className={column.width}
                  style={{ width: column.width }}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        <List
          height={height}
          itemCount={data.length}
          itemSize={rowHeight}
          width="100%"
          className="border-t"
        >
          {Row}
        </List>
      </div>
    </div>
  );
};

export { VirtualTable };
export type { Column as VirtualTableColumn };

