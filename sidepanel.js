document.addEventListener('DOMContentLoaded', function () {
    const addMemberForm = document.getElementById('add-member-form');
    const nameInput = document.getElementById('name-input');
    const timezoneSelect = document.getElementById('timezone-select');
    const profilePicInput = document.getElementById('profile-pic-input');
    const teamList = document.getElementById('team-list');
    const toggleFormBtn = document.getElementById('toggle-form-btn');
    const addButton = document.getElementById('add-button');
    const nameWarning = document.getElementById('name-warning');
    const timezoneWarning = document.getElementById('timezone-warning');

    // Load team members from chrome.storage.local
    let teamMembers = [];

    chrome.storage.local.get({ teamMembers: [] }, function (result) {
        teamMembers = result.teamMembers;
        displayTeamMembers();
    });

    function saveTeamMembers() {
        chrome.storage.local.set({ teamMembers: teamMembers });
    }

    function addTeamMember(name, timezone, profilePic) {
        teamMembers.push({ name, timezone, profilePic });
        saveTeamMembers();
        displayTeamMembers();
    }

    function removeTeamMember(index) {
        teamMembers.splice(index, 1);
        saveTeamMembers();
        displayTeamMembers();
    }

    function getCurrentTime(timezone) {
        try {
            const now = new Date();
            const options = { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' };
            return now.toLocaleString('en-US', options);
        } catch (error) {
            console.error("Error getting time for timezone:", timezone, error);
            return "Time unavailable";
        }
    }

    function displayTeamMembers() {
        teamList.innerHTML = '';
        teamMembers.forEach((member, index) => {
            const memberElement = document.createElement('div');
            memberElement.className = 'team-member';
            const currentTime = getCurrentTime(member.timezone);
            const [time, zoneName] = currentTime.split(' ');

            const profilePicSrc = member.profilePic || 'icons/default-profile.png';

            memberElement.innerHTML = `
                <img src="${profilePicSrc}" alt="${member.name}" class="profile-pic">
                <div class="member-info">
                    <div class="member-name">${member.name}</div>
                    <div class="member-time">
                        ${time} <span class="timezone-abbr">${zoneName}</span>
                    </div>
                </div>
                <button class="remove-btn" data-index="${index}">×</button>
            `;
            teamList.appendChild(memberElement);
        });
    }

    // Update the time every minute
    setInterval(displayTeamMembers, 60000);

    // Toggle form visibility
    toggleFormBtn.addEventListener('click', function() {
        addMemberForm.classList.toggle('expanded');
        if (addMemberForm.classList.contains('expanded')) {
            toggleFormBtn.textContent = 'Hide Form';
        } else {
            toggleFormBtn.textContent = 'Add New Member';
        }
    });

    addButton.addEventListener('click', (e) => {
        const name = nameInput.value.trim();
        const timezone = timezoneSelect.value;
        const profilePicFile = profilePicInput.files[0];

        // Reset warnings
        nameWarning.style.display = 'none';
        timezoneWarning.style.display = 'none';

        let isValid = true;

        if (!name) {
            nameWarning.textContent = 'Please enter a name';
            nameWarning.style.display = 'block';
            isValid = false;
        }

        if (!timezone) {
            timezoneWarning.textContent = 'Please select a timezone';
            timezoneWarning.style.display = 'block';
            isValid = false;
        }

        if (isValid) {
            if (profilePicFile) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    addTeamMember(name, timezone, event.target.result);
                };
                reader.readAsDataURL(profilePicFile);
            } else {
                addTeamMember(name, timezone, null);
            }
            nameInput.value = '';
            timezoneSelect.value = '';
            profilePicInput.value = '';
            addMemberForm.classList.remove('expanded');
            toggleFormBtn.textContent = 'Add New Member';
        }
    });

    teamList.addEventListener('click', function (e) {
        const removeBtn = e.target.closest('.remove-btn');
        if (removeBtn) {
            const index = removeBtn.getAttribute('data-index');
            removeTeamMember(parseInt(index));
        }
    });
});
