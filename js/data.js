// Configuration
const USE_SUPABASE = false; // Toggle this to true and fill in details to use Supabase
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Utility for UUID generation (mocking a DB ID)
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Service Items Data Layer
const ServiceData = {
    async getItems() {
        if (USE_SUPABASE) {
            // Implementation for Supabase GET
            // const res = await fetch(`${SUPABASE_URL}/rest/v1/service_items?select=*&order=order_index`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }});
            // return await res.json();
        } else {
            const items = localStorage.getItem('serviceItems');
            return items ? JSON.parse(items) : [];
        }
    },
    
    async saveItems(items) {
        if (USE_SUPABASE) {
            // Implementation for Supabase UPSERT
        } else {
            localStorage.setItem('serviceItems', JSON.stringify(items));
        }
    },

    async addItem(item) {
        const items = await this.getItems();
        const newItem = { id: generateId(), ...item };
        items.push(newItem);
        await this.saveItems(items);
        return newItem;
    },

    async deleteItem(id) {
        let items = await this.getItems();
        items = items.filter(i => i.id !== id);
        await this.saveItems(items);
    }
};

// Sermon Archive Data Layer
const SermonData = {
    async getSermons() {
        if (USE_SUPABASE) {
            // Implementation for Supabase GET
            // const res = await fetch(`${SUPABASE_URL}/rest/v1/sermons?select=*&order=date.desc`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }});
            // return await res.json();
        } else {
            const sermons = localStorage.getItem('sermons');
            if (!sermons) {
                const defaultSermons = [
                    {
                        id: "sermon-1",
                        title: "Entering Your Season of Unlimited Exploits",
                        speaker: "Pastor Uguru (Resident Pastor)",
                        speaker_type: "resident_pastor",
                        date: "2026-05-17",
                        series: "Exploits 2026",
                        service_category: "Sunday Service (8:00 AM)",
                        duration_minutes: 58,
                        media_type: "video",
                        tags: ["Exploits", "Altar of Fire"],
                        scripture: "Daniel 11:32",
                        media_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        notes: "A powerful message by our Resident Pastor on walking in divine empowerment, breaking limitations, and doing exploits in every area of life."
                    },
                    {
                        id: "sermon-2",
                        title: "The Fire on the Altar Must Not Go Out",
                        speaker: "Pastor Uguru (Resident Pastor)",
                        speaker_type: "resident_pastor",
                        date: "2026-05-15",
                        series: "Altar Encounter",
                        service_category: "Sunday Service (7:00 AM)",
                        duration_minutes: 65,
                        media_type: "video",
                        tags: ["Altar of Fire", "Restoration"],
                        scripture: "Leviticus 6:13",
                        media_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        notes: "Owerri Sunday early morning service focusing on preserving spiritual fire, consecration, and daily communion with God."
                    },
                    {
                        id: "sermon-3",
                        title: "Prophetic Restoration of Wasted Years",
                        speaker: "Regional Pastor",
                        speaker_type: "regional_pastor",
                        date: "2026-05-19",
                        series: "Restoration Series",
                        service_category: "Midweek Prophetic Service",
                        duration_minutes: 42,
                        media_type: "audio",
                        tags: ["Restoration", "Testimonies"],
                        scripture: "Joel 2:25",
                        media_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                        notes: "An inspiring midweek message on reclaiming lost opportunities, divine speed, and testimonies of restoration."
                    },
                    {
                        id: "sermon-4",
                        title: "Faith for Unbelievable Testimonies",
                        speaker: "Guest Minister",
                        speaker_type: "guest_minister",
                        date: "2026-05-10",
                        series: "Believing God",
                        service_category: "Sunday Service (9:45 AM)",
                        duration_minutes: 48,
                        media_type: "audio",
                        tags: ["Testimonies", "Exploits"],
                        scripture: "Mark 11:22-24",
                        media_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
                        notes: "Guest message emphasizing active faith, alignment with the Word, and birthing signs and wonders."
                    },
                    {
                        id: "sermon-5",
                        title: "Early Morning Dew of Grace",
                        speaker: "Regional Pastor",
                        speaker_type: "regional_pastor",
                        date: "2026-05-17",
                        series: "Grace and Mercy",
                        service_category: "Sunday Service (7:00 AM)",
                        duration_minutes: 50,
                        media_type: "video",
                        tags: ["Restoration", "Altar of Fire"],
                        scripture: "Psalm 63:1",
                        media_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        notes: "Sunday 7:00 AM service focusing on early morning devotion, seeking God's face, and walking in daily grace."
                    }
                ];
                localStorage.setItem('sermons', JSON.stringify(defaultSermons));
                return defaultSermons;
            }
            return JSON.parse(sermons);
        }
    },

    async saveSermon(sermon) {
        const sermons = await this.getSermons();
        const newSermon = { id: generateId(), created_at: new Date().toISOString(), ...sermon };
        sermons.push(newSermon);
        
        if (USE_SUPABASE) {
            // Implementation for Supabase POST
        } else {
            localStorage.setItem('sermons', JSON.stringify(sermons));
        }
        return newSermon;
    }
};

// State Management for active presentation
const PresentationState = {
    getState() {
        const state = localStorage.getItem('presentationState');
        return state ? JSON.parse(state) : { currentItemId: null, isRunning: false, timeRemaining: 0, totalDuration: 0 };
    },
    
    saveState(state) {
        localStorage.setItem('presentationState', JSON.stringify(state));
        // Dispatch an event so other tabs can update
        window.dispatchEvent(new Event('storage'));
    }
};

// Expose to window for global access
window.ServiceData = ServiceData;
window.SermonData = SermonData;
window.PresentationState = PresentationState;
