"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MenuItem } from './types'

interface SidebarNavigationProps {
  menuItems: MenuItem[]
  activeTab: string
  onTabChangeAction: (tab: string) => void
  collapsed?: boolean
  isMobile?: boolean
}

export function SidebarNavigation({ 
  menuItems, 
  activeTab, 
  onTabChangeAction, 
  collapsed = false,
  isMobile = false
}: SidebarNavigationProps) {
  const handleTabChange = (tab: string) => {
    onTabChangeAction(tab)
  }

  if (isMobile) {
    return (
      <nav className="px-4 space-y-1 py-4">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "default" : "ghost"}
            className={`w-full justify-start h-10 px-3 ${
              activeTab === item.id
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
                : "text-gray-700 hover:bg-gray-100/80"
            }`}
            onClick={() => handleTabChange(item.id)}
          >
            <item.icon className="h-4 w-4 mr-3" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-auto bg-orange-100 text-orange-800">
                {item.badge}
              </Badge>
            )}
          </Button>
        ))}
      </nav>
    )
  }

  return (
    <nav className="px-2 space-y-1 pb-4 pt-4">
      {menuItems.map((item) => (
        <Button
          key={item.id}
          variant={activeTab === item.id ? "default" : "ghost"}
          className={`w-full justify-center transition-colors duration-150 motion-reduce:transition-none group relative overflow-hidden ${
            activeTab === item.id
              ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/20 scale-[1.02]"
              : "text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:text-orange-700 hover:shadow-sm hover:border-orange-200/50 border border-transparent hover:scale-[1.01]"
          } ${collapsed ? "px-2 h-9" : "px-3 h-11"}`}
          onClick={() => onTabChangeAction(item.id)}
          title={collapsed ? item.label : undefined}
        >
          <item.icon className={`${collapsed ? "h-5 w-5" : "h-4 w-4 mr-3"} ${activeTab === item.id ? "drop-shadow-sm" : ""}`} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left font-medium text-sm">{item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto bg-orange-100 text-orange-700 shadow-sm border border-orange-200/50 text-xs px-2 py-0.5">
                  {item.badge}
                </Badge>
              )}
            </>
          )}
        </Button>
      ))}
    </nav>
  )
}
