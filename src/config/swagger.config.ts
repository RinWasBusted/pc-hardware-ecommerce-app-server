import type { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL as string + ':' + process.env.PORT as string|| `http://localhost:3000`;

const swaggerOptions: swaggerJsdoc.Options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'PC Hardware Ecommerce API',
			version: '1.0.0',
			description: 'API docs for PC Hardware Ecommerce App Server'
		},
		servers: [
			{
				url: `${BASE_URL}/api`,
				description: 'Main API Server'
			}
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT'
				}
			}
		}
	},
	apis: ['./src/api/**/*.ts', './src/server.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export const setupSwagger = (app: Application) => {
	const swaggerUiOptions = {
		swaggerOptions: {
			withCredentials: true
		}
	};

	app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

	app.get('/api-docs.json', (_req, res) => {
		res.setHeader('Content-Type', 'application/json');
		res.send(swaggerSpec);
	});
};
