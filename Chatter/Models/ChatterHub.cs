using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using Microsoft.AspNet.SignalR;
using Newtonsoft.Json;

namespace Chatter
{
    public class ChatterHub : Hub
    {
        public static Dictionary<string, string> Users { get; set; } = new Dictionary<string, string>();

        public ChatterHub()
        {
        }
        private string UserId => Context.ConnectionId;
        private string UserName
        {
            get
            {
                if (Users.TryGetValue(this.UserId, out var name))
                    return name;
                return null;
            }
        }

        public override Task OnConnected()
        {
            Users.Add(this.UserId, "Anonymous");
            Clients.Caller.receiveUserId(this.UserId);
            return base.OnConnected();
        }
        public override Task OnReconnected()
        {
            if (!Users.Keys.Any(x => x == this.UserId))
                Users.Add(this.UserId, this.UserName ?? "Anonymous");
            return base.OnConnected();
        }

        public override Task OnDisconnected(bool stopCalled)
        {
            if (Users.Keys.Any(x => x == this.UserId))
                Users.Remove(Context.ConnectionId);
            if (Users.Count() > 0)
                Clients.All.receiveConnectedUsers(Users);
            return base.OnDisconnected(stopCalled);
        }

        public void Hello(string name)
        {
            Users[this.UserId] = name;
            Clients.All.receiveConnectedUsers(Users);
        }

        public void Broadcast(string message)
        {
            Clients.Others.receiveMessage(this.UserId, this.UserName, message, isBroadcasted: true);
        }

        public void Send(string toUserId, string message)
        {
            if (Users.Keys.Any(x => x == toUserId))
                Clients.Client(toUserId).receiveMessage(this.UserId, this.UserName, message);
        }
    }
}