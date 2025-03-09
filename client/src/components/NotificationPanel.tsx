import { useState } from "react";
import { ChevronDown, ChevronUp, Bell } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { Notification } from "@shared/schema";

type NotificationPanelProps = {
  notifications: Notification[];
};

export default function NotificationPanel({ notifications }: NotificationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleNotifications = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <section className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
      <div 
        className="bg-[#F97316] text-white px-6 py-3 flex justify-between items-center cursor-pointer"
        onClick={toggleNotifications}
      >
        <h2 className="font-semibold flex items-center">
          <Bell className="mr-2 h-5 w-5" />
          Price Drop Alerts
        </h2>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </div>
      
      {isExpanded && (
        <div>
          {notifications.map((notification) => (
            <div key={notification.id} className="border-b border-gray-200 p-4 flex items-start">
              <div className="bg-green-100 p-1 rounded-full mr-3">
                <span className="material-icons text-success">arrow_downward</span>
              </div>
              <div className="flex-grow">
                <p className="text-sm font-medium text-gray-900">{notification.productName}</p>
                <p className="text-xs text-gray-500">
                  Price dropped by {notification.percentageDropped}% - Now ₹{notification.newPrice.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">{formatTimeAgo(new Date(notification.createdAt))}</p>
              </div>
              <a 
                href={notification.productUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-500 text-sm hover:underline"
              >
                View
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
