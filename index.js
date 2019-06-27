module.exports = function PetCheatDetect(mod) {
    // Data
    let SkillNames = {};
    mod.queryData('/StrSheet_ServantSkill/String/', [], true).then(results => {
        results.forEach(result => {
            SkillNames[result.attributes.id] = result.attributes.name;
        });
    });

    let ConditionalSkillIDs = {};
    mod.queryData('/ServantSkill/ConditionalSkillData/ConditionalSkill/', [], true).then(results => {
        results.forEach(result => {
            ConditionalSkillIDs[result.attributes.id] = result.attributes.stringId;
        });
    });

    // Implementation
    let Players = {};
    let Servants = {};

    function CheckSkill(ServantGameId, SkillId, Retry = true) {
        const Servant = Servants[ServantGameId];
        if (Servant) {
            const Owner = mod.game.me.is(Servant.owner) ? 'Stop cheating you idiot!' : Players[Servant.owner];
            if (Owner && !Servant.skills.includes(SkillId)) {
                mod.log(`Potential pet cheater detected: ${Owner}!`);
                mod.log(`Used skill: ${SkillId}, available skills: ${Servant.skills}!`);
            } else if (Retry) {
                mod.setTimeout(() => CheckSkill(ServantGameId, SkillId, false), 500);
            }
        } else if (Retry) {
            mod.setTimeout(() => CheckSkill(ServantGameId, SkillId, false), 500);
        }
    }

    mod.game.on('enter_game', () => {
        Players = {};
        Servants = {};
    });

    mod.hook('S_SPAWN_USER', 15, event => {
        Players[event.gameId] = `${event.name} (Server: "${mod.serverList[event.serverId].name}", PlayerId: ${event.playerId})`;
    });

    mod.hook('S_DESPAWN_USER', 3, event => {
        delete Players[event.gameId];
    });

    mod.hook('S_REQUEST_SPAWN_SERVANT', 2, async event => {
        let AvailableSkills = event.giftedSkills.map(id => ConditionalSkillIDs[id]);
        const ActiveSkills = await mod.queryData('/ServantData/Servant@id=?/PartnerSkill/ActiveSkill/', [event.id], true);
        for (const ActiveSkill of ActiveSkills) {
            const SkillData = await mod.queryData('/ServantSkill/ActiveSkillData/ActiveSkill@id=?/SkillData@grade=?/', [ActiveSkill.attributes.id, event.fellowship]);
            AvailableSkills.push(SkillData.attributes.skillId);
        }

        Servants[event.gameId] = {
            owner: event.ownerId,
            skills: AvailableSkills
        };
    });

    mod.hook('S_REQUEST_DESPAWN_SERVANT', 1, event => {
        delete Servants[event.gameId];
    });

    mod.hook('S_ACTION_STAGE', 9, event => {
        CheckSkill(event.gameId, event.skill.id);
    });
};
