"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, BookOpen, FileText } from "lucide-react"
import type { ChunkingStats } from "@/lib/types"

interface StatsDisplayProps {
  stats: ChunkingStats | null
}

export function StatsDisplay({ stats }: StatsDisplayProps) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>No statistics available.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Total Chunks:</span>
            <span className="font-medium">{stats.totalChunks}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Tokens:</span>
            <span className="font-medium">{stats.totalTokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Avg Size (chars):</span>
            <span className="font-medium">{stats.averageChunkSize > 0 ? Math.round(stats.averageChunkSize) : 0}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Distribution by Level
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {stats.chunksByLevel && Object.entries(stats.chunksByLevel).length > 0 ? (
            Object.entries(stats.chunksByLevel)
              .sort(([levelA], [levelB]) => Number.parseInt(levelA) - Number.parseInt(levelB))
              .map(([level, count]) => (
                <div key={level} className="flex justify-between items-center">
                  <span>Level {level}:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(count / stats.totalChunks) * 100}%` }}
                      />
                    </div>
                    <span className="font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No level distribution data.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Distribution by Page
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm max-h-48 overflow-y-auto">
          {stats.chunksByPage && Object.entries(stats.chunksByPage).length > 0 ? (
            Object.entries(stats.chunksByPage)
              .sort(([pageA], [pageB]) => Number.parseInt(pageA) - Number.parseInt(pageB))
              .map(([page, count]) => (
                <div key={page} className="flex justify-between items-center">
                  <span>Page {page}:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(count / stats.totalChunks) * 100}%` }}
                      />
                    </div>
                    <span className="font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No page distribution data.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
