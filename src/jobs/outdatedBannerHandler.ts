import cron from 'node-cron';
import { prisma } from '../utils/prisma.js';

export const unactivateOutdatedBanners = async () => {
	const now = new Date();

	const result = await prisma.banners.updateMany({
		where: {
			is_active: true,
			end_date: {
				lt: now,
			},
		},
		data: {
			is_active: false,
		},
	});

	if (result.count > 0) {
		console.log(`Unactivated ${result.count} outdated banner(s)`);
	}

	return result.count;
};

export const startOutdatedBannerHandler = () => {
	// Run once every day at 00:00 server time.
	cron.schedule('0 0 * * *', () => {
		unactivateOutdatedBanners().catch((error) => {
			console.error('Failed to unactivate outdated banners:', error);
		});
	});
};
