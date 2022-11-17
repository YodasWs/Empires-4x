/* app.json */
yodasws.page('home').setRoute({
	template: 'pages/home.html',
	route: '/',
}).on('load', () => {
	console.log('Sam, json:', json);
	// TODO: Build World Map
});
