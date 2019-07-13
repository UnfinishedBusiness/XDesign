class Notification {

  constructor() {
    this.Notifications = [];
  }

  push(text)
  {
    this.Notifications.push(text);
    //$("#NotificationCount").html("You have " + this.Notifications.length + " notifications");

    //$("#NotificationMenu").html(""); //Clear then rebuild from array
    for (var x = 0; x < this.Notifications.length; x++)
    {
      //$("#NotificationMenu").append("<li><a href=\"#\"><i class=\"fa fa-exclamation-triangle text-red\"></i> " + this.Notifications[x] + "</a></li>");
    }
    //$("#NotificationIndicator").addClass("label-warning");
    //$("#NotificationIndicator").html(this.Notifications.length);
  }
  clear()
  {
    this.Notifications = [];
    /*$("#NotificationMenu").html("");
    $("#NotificationCount").html("You have " + this.Notifications.length + " notifications");
    $("#NotificationIndicator").removeClass("label-warning");
    $("#NotificationIndicator").html("");*/
  }

}
