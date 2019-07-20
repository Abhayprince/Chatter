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
        public static Dictionary<string,string> Users { get; set; }
        static ChatterHub()
        {
            Users = new Dictionary<string, string>();
        }
        public ChatterHub()
        {
            if (Users == null)
                Users = new Dictionary<string, string>();
        }
        private string UserId => Context.ConnectionId;
        private string UserName => Users[Context.ConnectionId];

        public override Task OnConnected()
        {
            //string userId = Context.ConnectionId;            
            Users.Add(this.UserId, "Anonymous");

            Clients.Caller.hello("Send to only the last one");
            Clients.Others.hello("Send to everyone except last");
            
            return base.OnConnected();
        }
        public override Task OnDisconnected(bool stopCalled)
        {
            if(Users?.Keys.Any(x=>x== this.UserId)==true)
                Users.Remove(Context.ConnectionId);
            return base.OnDisconnected(stopCalled);
        }
        public void Hello(string name)
        {
            Users[this.UserId] = name;
            //Clients.All.usersList(JsonConvert.SerializeObject(Users));
            Clients.All.usersList(Users);
        }
        public void Broadcast(string message)
        {
            Clients.Others.broadcast(this.UserName,message);
        }
        public void Send(string toUserId, string message)
        {
            if (Users.Keys.Any(x => x == toUserId))
                Clients.Client(toUserId).send(this.UserName, message);
        }
    }
}