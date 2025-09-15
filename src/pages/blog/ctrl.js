yodasws.page('pageBlog').setRoute({
	title: 'Blog',
	canonicalRoute: '/blog/',
	template(match, ...p) {
		const path = p.join('/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '').split('/').filter(p => p != '');
		if (path.length === 0) {
			return 'pages/blog/index.html';
		}
		return {
			canonicalRoute: '/blog/' + path.join('/') + '/',
			template: 'pages/blog/' + path.join('.') + '.html',
		};
	},
	route: '/blog(/.*)*',
}).on('load', () => {
});
