

// Initialize Dexie database
const db = new Dexie('MQTTProfiles');
db.version(1).stores({
    profiles: '++id,name,ip,port,mqttid,password,publishTopic,subscribeTopic',
    settings: 'key, value'

});

// Function to save profile
async function saveProfile() {
    const profileName = document.getElementById("profileName").value;
    if (!profileName) {
        alert("Please enter a profile name.");
        return;
    }

    const profile = {
        name: profileName,
        protocol: document.getElementById("protocol").value,
        ip: document.getElementById("ip").value,
        port: document.getElementById("port").value,
        mqttid: document.getElementById("mqttid").value,
        password: document.getElementById("password").value,
        publishTopic: document.getElementById("publishTopic").value,
        subscribeTopic: document.getElementById("subscribeTopic").value
    };

    try {
        await db.profiles.add(profile);
        alert("Profile saved successfully!");
        loadProfileList();
    } catch (error) {
        console.error("Error saving profile:", error);
        alert("Error saving profile.");
    }
}

// Function to load profile list
 async function loadProfileList() {
    const profileList = document.getElementById("profileList");
    profileList.innerHTML = '<option value="">Select a profile</option>';

    const profiles = await db.profiles.toArray();
    profiles.forEach(profile => {
        const option = document.createElement("option");
        option.value = profile.id;
        option.textContent = profile.name;
        profileList.appendChild(option);
    });
}

// Function to load profile
async function loadProfile() {
    const profileId = document.getElementById("profileList").value;
    if (!profileId) {
        alert("Please select a profile to load.");
        return;
    }

    const profile = await db.profiles.get(parseInt(profileId));
    if (profile) {
        document.getElementById("protocol").value = profile.protocol;
        document.getElementById("ip").value = profile.ip;
        document.getElementById("port").value = profile.port;
        document.getElementById("mqttid").value = profile.mqttid;
        document.getElementById("password").value = profile.password;
        document.getElementById("publishTopic").value = profile.publishTopic;
        document.getElementById("subscribeTopic").value = profile.subscribeTopic;
        alert("Profile loaded successfully!");

        setLastSelectedProfile(profileId);

    } else {
        alert("Profile not found.");
    }
}

// Function to delete profile
async function deleteProfile() {
    const profileId = document.getElementById("profileList").value;
    if (!profileId) {
        alert("Please select a profile to delete.");
        return;
    }

    if (confirm("Are you sure you want to delete this profile?")) {
        try {
            await db.profiles.delete(parseInt(profileId));
            alert("Profile deleted successfully!");
            loadProfileList();
        } catch (error) {
            console.error("Error deleting profile:", error);
            alert("Error deleting profile.");
        }
    }
}

// // Add event listeners
