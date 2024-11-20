import { Marp } from '@marp-team/marp-core';

export const marpConfig = {
	html:true,
	emoji: {
		shortcode:true,
		unicode:false
	}
}

export const marp = new Marp(marpConfig);

export const marpThemeSet = marp.themeSet.default;
